from datetime import date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import StaffMembership
from apps.billing.models import Payment
from apps.operations.models import CashDrawerShift
from apps.reservations.models import Reservation

from .models import BusinessDayClose, HouseAccount, HouseAccountActivity, JournalEntry, LedgerAccount
from .serializers import (
    BusinessDayCloseSerializer,
    HouseAccountActivitySerializer,
    HouseAccountSerializer,
    JournalEntrySerializer,
    LedgerAccountSerializer,
)
from .services import ensure_business_day_open, hotel_local_date


class HotelScopedViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def hotel_queryset(self, queryset):
        hotel_ids = StaffMembership.objects.filter(
            user=self.request.user,
            role__in=[
                StaffMembership.Role.OWNER,
                StaffMembership.Role.MANAGER,
                StaffMembership.Role.ACCOUNTANT,
            ],
            is_active=True,
        ).values_list("hotel_id", flat=True)
        queryset = queryset.filter(hotel_id__in=hotel_ids)
        hotel_id = self.request.user.resolve_hotel_context(self.request)
        if hotel_id is not None:
            queryset = queryset.filter(hotel_id=hotel_id)
        return queryset

    def permitted_hotel(self):
        hotel_id = self.request.user.resolve_hotel_context(self.request)
        if hotel_id is not None:
            hotel = self.request.user.staff_memberships.select_related("hotel").get(
                hotel_id=hotel_id, is_active=True
            ).hotel
            return hotel
        hotel_ids = self.request.user.staff_memberships.filter(
            role__in=[
                StaffMembership.Role.OWNER,
                StaffMembership.Role.MANAGER,
                StaffMembership.Role.ACCOUNTANT,
            ],
            is_active=True,
        ).values_list("hotel_id", flat=True)
        if len(hotel_ids) == 1:
            from apps.hotels.models import Hotel
            return Hotel.objects.get(pk=hotel_ids[0])
        raise ValidationError({"hotel": "Select a hotel before using this endpoint."})


class HouseAccountViewSet(HotelScopedViewSet):
    serializer_class = HouseAccountSerializer
    queryset = HouseAccount.objects.all()

    def get_queryset(self):
        return self.hotel_queryset(self.queryset).annotate(
            activity_count=Count("activities")
        )


class HouseAccountActivityViewSet(HotelScopedViewSet):
    serializer_class = HouseAccountActivitySerializer
    queryset = HouseAccountActivity.objects.select_related("account", "account__hotel", "recorded_by")
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        hotel_ids = StaffMembership.objects.filter(
            user=self.request.user, is_active=True
        ).values_list("hotel_id", flat=True)
        queryset = self.queryset.filter(account__hotel_id__in=hotel_ids)
        hotel_id = self.request.user.resolve_hotel_context(self.request)
        if hotel_id is not None:
            queryset = queryset.filter(account__hotel_id=hotel_id)
        account_id = self.request.query_params.get("account")
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class LedgerAccountViewSet(HotelScopedViewSet):
    serializer_class = LedgerAccountSerializer
    queryset = LedgerAccount.objects.all()

    def get_queryset(self):
        return self.hotel_queryset(self.queryset)

    @action(detail=False, methods=["post"], url_path="seed-defaults")
    def seed_defaults(self, request):
        hotel = self.permitted_hotel()
        defaults = [
            ("1000", "Cash and cash equivalents", LedgerAccount.AccountType.ASSET),
            ("1100", "Accounts receivable", LedgerAccount.AccountType.ASSET),
            ("2000", "Accounts payable", LedgerAccount.AccountType.LIABILITY),
            ("3000", "Owner equity", LedgerAccount.AccountType.EQUITY),
            ("4000", "Room and service revenue", LedgerAccount.AccountType.REVENUE),
            ("5000", "Operating expenses", LedgerAccount.AccountType.EXPENSE),
        ]
        created_accounts = []
        for code, name, account_type in defaults:
            account, created = LedgerAccount.objects.get_or_create(
                hotel=hotel,
                code=code,
                defaults={"name": name, "account_type": account_type},
            )
            if created:
                created_accounts.append(account)
        return Response(
            self.get_serializer(self.get_queryset(), many=True).data,
            status=status.HTTP_201_CREATED if created_accounts else status.HTTP_200_OK,
        )


class JournalEntryViewSet(HotelScopedViewSet):
    serializer_class = JournalEntrySerializer
    queryset = JournalEntry.objects.prefetch_related("lines__account").all()
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return self.hotel_queryset(self.queryset)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        if instance.status != JournalEntry.Status.DRAFT:
            raise ValidationError({"status": "Posted journal entries cannot be deleted."})
        instance.delete()

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def post(self, request, pk=None):
        entry = self.get_object()
        if entry.status != JournalEntry.Status.DRAFT:
            raise ValidationError({"status": "Only draft journal entries can be posted."})
        try:
            ensure_business_day_open(entry.hotel, entry.entry_date)
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict) from exc
        lines = list(entry.lines.all())
        if len(lines) < 2:
            raise ValidationError({"lines": "A journal entry needs at least two lines."})
        debit_total = sum((line.debit for line in lines), Decimal("0"))
        credit_total = sum((line.credit for line in lines), Decimal("0"))
        if debit_total <= 0 or debit_total != credit_total:
            raise ValidationError({"lines": "Journal debits and credits must be equal and greater than zero."})
        entry.status = JournalEntry.Status.POSTED
        entry.posted_by = request.user
        entry.posted_at = timezone.now()
        entry.save(update_fields=["status", "posted_by", "posted_at"])
        return Response(self.get_serializer(entry).data)


class BusinessDayCloseViewSet(HotelScopedViewSet):
    serializer_class = BusinessDayCloseSerializer
    queryset = BusinessDayClose.objects.select_related("hotel", "closed_by").all()
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return self.hotel_queryset(self.queryset)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        hotel = self.permitted_hotel()
        raw_date = request.query_params.get("date")
        try:
            business_date = datetime.strptime(raw_date, "%Y-%m-%d").date() if raw_date else hotel_local_date(hotel)
        except ValueError as exc:
            raise ValidationError({"date": "Use YYYY-MM-DD for the business date."}) from exc

        local_tz = ZoneInfo(hotel.timezone)
        start = timezone.make_aware(datetime.combine(business_date, time.min), local_tz)
        end = start + timedelta(days=1)
        payments = Payment.objects.filter(
            folio__hotel=hotel,
            status=Payment.Status.COMPLETED,
            paid_at__gte=start,
            paid_at__lt=end,
        ).aggregate(total=Sum("amount"), count=Count("id"))
        shifts = CashDrawerShift.objects.filter(
            hotel=hotel, opened_at__gte=start, opened_at__lt=end
        )
        return Response({
            "business_date": business_date,
            "arrivals": Reservation.objects.filter(hotel=hotel, check_in_date=business_date).count(),
            "departures": Reservation.objects.filter(hotel=hotel, check_out_date=business_date).count(),
            "completed_payment_count": payments["count"] or 0,
            "completed_payment_total": payments["total"] or Decimal("0.00"),
            "cash_shift_count": shifts.count(),
            "open_cash_shift_count": shifts.filter(status=CashDrawerShift.Status.OPEN).count(),
            "expected_cash_total": shifts.aggregate(total=Sum("expected_cash"))["total"] or Decimal("0.00"),
            "is_closed": BusinessDayClose.objects.filter(hotel=hotel, business_date=business_date).exists(),
        })

    @action(detail=False, methods=["post"])
    @transaction.atomic
    def close(self, request):
        hotel = self.permitted_hotel()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        business_date = serializer.validated_data["business_date"]
        if business_date > hotel_local_date(hotel):
            raise ValidationError({"business_date": "A future business date cannot be closed."})
        if BusinessDayClose.objects.filter(hotel=hotel, business_date=business_date).exists():
            raise ValidationError({"business_date": "This business day is already closed."})
        if CashDrawerShift.objects.filter(
            hotel=hotel,
            opened_at__gte=timezone.make_aware(datetime.combine(business_date, time.min), ZoneInfo(hotel.timezone)),
            opened_at__lt=timezone.make_aware(datetime.combine(business_date + timedelta(days=1), time.min), ZoneInfo(hotel.timezone)),
            status=CashDrawerShift.Status.OPEN,
        ).exists():
            raise ValidationError({"cash_reconciled": "Close all cash drawer shifts before closing the business day."})
        instance = serializer.save(hotel=hotel, closed_by=request.user)
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)


class AccountingReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hotel_id = request.user.resolve_hotel_context(request)
        memberships = StaffMembership.objects.filter(
            user=request.user,
            role__in=[
                StaffMembership.Role.OWNER,
                StaffMembership.Role.MANAGER,
                StaffMembership.Role.ACCOUNTANT,
            ],
            is_active=True,
        )
        if hotel_id is None:
            hotel_ids = list(memberships.values_list("hotel_id", flat=True))
            if len(hotel_ids) != 1:
                raise ValidationError({"hotel": "Select a hotel before viewing accounting reports."})
            hotel_id = hotel_ids[0]
        accounts = list(LedgerAccount.objects.filter(hotel_id=hotel_id))
        posted_entries = JournalEntry.objects.filter(
            hotel_id=hotel_id,
            status=JournalEntry.Status.POSTED,
        )
        raw_start_date = request.query_params.get("start_date")
        raw_end_date = request.query_params.get("end_date")
        try:
            start_date = date.fromisoformat(raw_start_date) if raw_start_date else None
            end_date = date.fromisoformat(raw_end_date) if raw_end_date else None
        except ValueError as exc:
            raise ValidationError({"period": "Use YYYY-MM-DD for accounting report dates."}) from exc
        if start_date and end_date and start_date > end_date:
            raise ValidationError({"period": "start_date must be on or before end_date."})

        period_entries = posted_entries
        if start_date:
            period_entries = period_entries.filter(entry_date__gte=start_date)
        if end_date:
            period_entries = period_entries.filter(entry_date__lte=end_date)
        position_entries = posted_entries
        if end_date:
            position_entries = position_entries.filter(entry_date__lte=end_date)

        def account_totals(entries):
            totals = {
                account.id: {
                    "id": account.id,
                    "code": account.code,
                    "name": account.name,
                    "account_type": account.account_type,
                    "debit": Decimal("0.00"),
                    "credit": Decimal("0.00"),
                }
                for account in accounts
            }
            rows = entries.values(
                "lines__account_id",
                "lines__account__code",
                "lines__account__name",
                "lines__account__account_type",
            ).annotate(
                debit=Sum("lines__debit"),
                credit=Sum("lines__credit"),
            ).order_by("lines__account__code")
            for row in rows:
                account_id = row["lines__account_id"]
                if account_id is not None:
                    totals[account_id]["debit"] = row["debit"] or Decimal("0.00")
                    totals[account_id]["credit"] = row["credit"] or Decimal("0.00")
            return list(totals.values())

        trial_balance = account_totals(period_entries)
        position_totals = account_totals(position_entries)
        revenue = sum((a["credit"] - a["debit"] for a in trial_balance if a["account_type"] == LedgerAccount.AccountType.REVENUE), Decimal("0.00"))
        expenses = sum((a["debit"] - a["credit"] for a in trial_balance if a["account_type"] == LedgerAccount.AccountType.EXPENSE), Decimal("0.00"))
        cumulative_revenue = sum((a["credit"] - a["debit"] for a in position_totals if a["account_type"] == LedgerAccount.AccountType.REVENUE), Decimal("0.00"))
        cumulative_expenses = sum((a["debit"] - a["credit"] for a in position_totals if a["account_type"] == LedgerAccount.AccountType.EXPENSE), Decimal("0.00"))
        balance_sheet = {
            "assets": sum((a["debit"] - a["credit"] for a in position_totals if a["account_type"] == LedgerAccount.AccountType.ASSET), Decimal("0.00")),
            "liabilities": sum((a["credit"] - a["debit"] for a in position_totals if a["account_type"] == LedgerAccount.AccountType.LIABILITY), Decimal("0.00")),
            "equity": sum((a["credit"] - a["debit"] for a in position_totals if a["account_type"] == LedgerAccount.AccountType.EQUITY), Decimal("0.00")) + cumulative_revenue - cumulative_expenses,
        }
        return Response({
            "trial_balance": trial_balance,
            "income_statement": {"revenue": revenue, "expenses": expenses, "net_income": revenue - expenses},
            "balance_sheet": balance_sheet,
            "period": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            },
        })
