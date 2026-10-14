from decimal import Decimal

from rest_framework import serializers

from apps.accounts.models import StaffMembership
from apps.operations.models import (
    CashDrawerEntry,
    CashDrawerShift,
    GuestFeedback,
    IncidentReport,
    InventoryItem,
    InventoryMovement,
    MarketingCampaign,
    ProductionRecord,
)


class CashDrawerShiftSerializer(serializers.ModelSerializer):
    variance = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CashDrawerShift
        fields = [
            "id",
            "hotel",
            "opened_by",
            "closed_by",
            "opening_cash",
            "counted_cash",
            "expected_cash",
            "status",
            "opened_at",
            "closed_at",
            "updated_at",
            "notes",
            "variance",
        ]
        read_only_fields = ["id", "opened_by", "closed_by", "opened_at", "closed_at", "updated_at", "variance"]

    def get_variance(self, obj):
        if obj.counted_cash is None or obj.expected_cash is None:
            return None
        return obj.counted_cash - obj.expected_cash

    def validate(self, attrs):
        hotel = attrs.get("hotel", getattr(self.instance, "hotel", None))
        if hotel and self.context.get("request"):
            user = self.context["request"].user
            if not StaffMembership.objects.filter(user=user, hotel=hotel, is_active=True).exists():
                raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})
        return attrs


class CashDrawerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = CashDrawerEntry
        fields = [
            "id",
            "shift",
            "entry_type",
            "amount",
            "description",
            "entered_by",
            "created_at",
        ]
        read_only_fields = ["id", "entered_by", "created_at"]

    def validate(self, attrs):
        shift = attrs.get("shift", getattr(self.instance, "shift", None))
        if shift and shift.status == CashDrawerShift.Status.CLOSED:
            raise serializers.ValidationError({"shift": "This drawer shift is already closed."})
        return attrs


class InventoryItemSerializer(serializers.ModelSerializer):
    low_stock = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "hotel",
            "name",
            "sku",
            "category",
            "unit",
            "quantity",
            "reorder_level",
            "low_stock",
            "unit_cost",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "low_stock", "created_at", "updated_at"]

    def get_low_stock(self, obj):
        return obj.quantity <= obj.reorder_level

    def validate(self, attrs):
        hotel = attrs.get("hotel", getattr(self.instance, "hotel", None))
        if hotel and self.context.get("request"):
            user = self.context["request"].user
            if not StaffMembership.objects.filter(user=user, hotel=hotel, is_active=True).exists():
                raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})
        return attrs


class InventoryMovementSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = InventoryMovement
        fields = [
            "id",
            "item",
            "item_name",
            "movement_type",
            "quantity",
            "unit_cost",
            "notes",
            "recorded_by",
            "created_at",
        ]
        read_only_fields = ["id", "item_name", "recorded_by", "created_at"]

    def get_item_name(self, obj):
        return obj.item.name if obj.item else None

    def validate(self, attrs):
        item = attrs.get("item", getattr(self.instance, "item", None))
        if item and self.context.get("request"):
            user = self.context["request"].user
            if not StaffMembership.objects.filter(user=user, hotel=item.hotel, is_active=True).exists():
                raise serializers.ValidationError({"item": "This stock item does not belong to a hotel you can access."})
        return attrs


class ProductionRecordSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProductionRecord
        fields = [
            "id",
            "hotel",
            "item",
            "item_name",
            "name",
            "outlet",
            "quantity",
            "unit",
            "produced_at",
            "recorded_by",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "item_name", "recorded_by", "created_at"]

    def get_item_name(self, obj):
        return obj.item.name if obj.item else obj.name

    def validate(self, attrs):
        hotel = attrs.get("hotel", getattr(self.instance, "hotel", None))
        item = attrs.get("item", getattr(self.instance, "item", None))
        quantity = attrs.get("quantity", getattr(self.instance, "quantity", None))

        if hotel and self.context.get("request"):
            user = self.context["request"].user
            if not StaffMembership.objects.filter(user=user, hotel=hotel, is_active=True).exists():
                raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})

        if item is not None and hotel is not None and item.hotel_id != hotel.id:
            raise serializers.ValidationError({"item": "This item does not belong to the selected hotel."})

        if item is not None and quantity is not None and item.quantity < quantity:
            raise serializers.ValidationError({"quantity": "Production quantity exceeds the available stock for this item."})

        return attrs


class MarketingCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketingCampaign
        fields = [
            "id",
            "hotel",
            "name",
            "channel",
            "budget",
            "starts_on",
            "ends_on",
            "status",
            "notes",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def validate(self, attrs):
        hotel = attrs.get("hotel", getattr(self.instance, "hotel", None))
        if hotel and self.context.get("request"):
            user = self.context["request"].user
            if not StaffMembership.objects.filter(user=user, hotel=hotel, is_active=True).exists():
                raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})
        return attrs


class GuestFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestFeedback
        fields = [
            "id",
            "hotel",
            "guest",
            "reservation",
            "rating",
            "category",
            "comment",
            "status",
            "follow_up_notes",
            "received_at",
            "recorded_by",
        ]
        read_only_fields = ["id", "received_at", "recorded_by"]

    def validate(self, attrs):
        hotel = attrs.get("hotel", getattr(self.instance, "hotel", None))
        if hotel and self.context.get("request"):
            user = self.context["request"].user
            if not StaffMembership.objects.filter(user=user, hotel=hotel, is_active=True).exists():
                raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})
        return attrs


class IncidentReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentReport
        fields = [
            "id",
            "hotel",
            "incident_type",
            "occurred_at",
            "location",
            "description",
            "action_taken",
            "police_reference",
            "status",
            "reported_by",
            "created_at",
        ]
        read_only_fields = ["id", "reported_by", "created_at"]

    def validate(self, attrs):
        hotel = attrs.get("hotel", getattr(self.instance, "hotel", None))
        if hotel and self.context.get("request"):
            user = self.context["request"].user
            if not StaffMembership.objects.filter(user=user, hotel=hotel, is_active=True).exists():
                raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})
        return attrs
