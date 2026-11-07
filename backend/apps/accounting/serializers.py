from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.models import StaffMembership

from .models import (
    BusinessDayClose,
    HouseAccount,
    HouseAccountActivity,
    JournalEntry,
    JournalLine,
    LedgerAccount,
)
from .services import ensure_business_day_open, hotel_local_date


def validate_hotel_access(request, hotel):
    allowed_roles = [
        StaffMembership.Role.OWNER,
        StaffMembership.Role.MANAGER,
        StaffMembership.Role.ACCOUNTANT,
    ]
    if request and hotel and not StaffMembership.objects.filter(
        user=request.user, hotel=hotel, role__in=allowed_roles, is_active=True
    ).exists():
        raise serializers.ValidationError({"hotel": "You do not have finance access to this hotel."})


class HouseAccountSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = HouseAccount
        fields = ["id", "hotel", "name", "contact_name", "email", "phone", "credit_limit", "status", "notes", "balance", "created_at", "updated_at"]
        read_only_fields = ["id", "balance", "created_at", "updated_at"]

    def validate_hotel(self, hotel):
        validate_hotel_access(self.context.get("request"), hotel)
        return hotel


class HouseAccountActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = HouseAccountActivity
        fields = ["id", "account", "activity_type", "amount", "description", "reference", "transaction_date", "recorded_by", "created_at"]
        read_only_fields = ["id", "recorded_by", "created_at"]
        extra_kwargs = {"transaction_date": {"required": False}}

    def validate(self, attrs):
        account = attrs.get("account")
        request = self.context.get("request")
        if account and request:
            validate_hotel_access(request, account.hotel)
            transaction_date = attrs.get("transaction_date", hotel_local_date(account.hotel))
            try:
                ensure_business_day_open(account.hotel, transaction_date)
            except DjangoValidationError as exc:
                raise serializers.ValidationError(exc.message_dict) from exc
            attrs["transaction_date"] = transaction_date
            if account.status != HouseAccount.Status.ACTIVE:
                raise serializers.ValidationError({"account": "Inactive house accounts cannot be charged or settled."})
            if attrs.get("activity_type") == HouseAccountActivity.ActivityType.SETTLEMENT:
                outstanding = account.balance
                amount = attrs.get("amount", Decimal("0.00"))
                if amount > outstanding:
                    raise serializers.ValidationError({"amount": f"Settlement cannot exceed the outstanding balance of {outstanding}."})
            if attrs.get("activity_type") == HouseAccountActivity.ActivityType.CHARGE:
                amount = attrs.get("amount", Decimal("0.00"))
                if account.credit_limit > 0 and account.balance + amount > account.credit_limit:
                    raise serializers.ValidationError({"amount": "This charge would exceed the account credit limit."})
        return attrs


class LedgerAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerAccount
        fields = ["id", "hotel", "code", "name", "account_type", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_hotel(self, hotel):
        validate_hotel_access(self.context.get("request"), hotel)
        return hotel


class JournalLineSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)
    account_code = serializers.CharField(source="account.code", read_only=True)

    class Meta:
        model = JournalLine
        fields = ["id", "account", "account_name", "account_code", "description", "debit", "credit"]
        read_only_fields = ["id", "account_name", "account_code"]


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True)

    class Meta:
        model = JournalEntry
        fields = ["id", "hotel", "entry_date", "reference", "description", "status", "created_by", "posted_by", "created_at", "posted_at", "lines"]
        read_only_fields = ["id", "status", "created_by", "posted_by", "created_at", "posted_at"]

    def validate(self, attrs):
        hotel = attrs.get("hotel", getattr(self.instance, "hotel", None))
        entry_date = attrs.get("entry_date", getattr(self.instance, "entry_date", None))
        if hotel:
            validate_hotel_access(self.context.get("request"), hotel)
            if entry_date:
                try:
                    ensure_business_day_open(hotel, entry_date)
                except DjangoValidationError as exc:
                    raise serializers.ValidationError(exc.message_dict) from exc

        lines = attrs.get("lines")
        if lines is not None:
            if len(lines) < 2:
                raise serializers.ValidationError({"lines": "A journal entry needs at least two lines."})
            debit_total = sum((line.get("debit", Decimal("0")) for line in lines), Decimal("0"))
            credit_total = sum((line.get("credit", Decimal("0")) for line in lines), Decimal("0"))
            if debit_total <= 0 or debit_total != credit_total:
                raise serializers.ValidationError({"lines": "Journal debits and credits must be equal and greater than zero."})
            for line in lines:
                debit = line.get("debit", Decimal("0"))
                credit = line.get("credit", Decimal("0"))
                if (debit > 0) == (credit > 0):
                    raise serializers.ValidationError({"lines": "Each line must have either a debit or a credit, not both."})
                if line["account"].hotel_id != hotel.id:
                    raise serializers.ValidationError({"lines": "All accounts must belong to the selected hotel."})
        return attrs

    def create(self, validated_data):
        lines = validated_data.pop("lines")
        entry = JournalEntry.objects.create(**validated_data)
        JournalLine.objects.bulk_create([JournalLine(entry=entry, **line) for line in lines])
        return entry

    def update(self, instance, validated_data):
        lines = validated_data.pop("lines", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            JournalLine.objects.bulk_create([JournalLine(entry=instance, **line) for line in lines])
        return instance


class BusinessDayCloseSerializer(serializers.ModelSerializer):
    closed_by_name = serializers.CharField(source="closed_by.get_full_name", read_only=True)

    class Meta:
        model = BusinessDayClose
        fields = ["id", "hotel", "business_date", "reservations_reviewed", "payments_reconciled", "cash_reconciled", "revenue_reviewed", "notes", "closed_by", "closed_by_name", "closed_at"]
        read_only_fields = ["id", "hotel", "closed_by", "closed_by_name", "closed_at"]

    def validate(self, attrs):
        if not all(attrs.get(field, False) for field in (
            "reservations_reviewed", "payments_reconciled", "cash_reconciled", "revenue_reviewed"
        )):
            raise serializers.ValidationError({"checklist": "Complete every closing checklist item before closing the business day."})
        return attrs
