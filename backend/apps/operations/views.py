from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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
from apps.operations.serializers import (
    CashDrawerEntrySerializer,
    CashDrawerShiftSerializer,
    GuestFeedbackSerializer,
    IncidentReportSerializer,
    InventoryItemSerializer,
    InventoryMovementSerializer,
    MarketingCampaignSerializer,
    ProductionRecordSerializer,
)


class HotelScopedViewMixin:
    permission_classes = [IsAuthenticated]

    def get_hotel_queryset(self, queryset):
        hotel_ids = StaffMembership.objects.filter(user=self.request.user, is_active=True).values_list("hotel_id", flat=True)
        if hasattr(queryset.model, "hotel"):
            queryset = queryset.filter(hotel_id__in=hotel_ids)
        elif hasattr(queryset.model, "item"):
            queryset = queryset.filter(item__hotel_id__in=hotel_ids)
        elif hasattr(queryset.model, "shift"):
            queryset = queryset.filter(shift__hotel_id__in=hotel_ids)
        else:
            queryset = queryset.none()

        hotel = self.request.user.resolve_hotel_context(self.request)
        if hotel is not None:
            if hasattr(queryset.model, "hotel"):
                queryset = queryset.filter(hotel_id=hotel)
            elif hasattr(queryset.model, "item"):
                queryset = queryset.filter(item__hotel_id=hotel)
            elif hasattr(queryset.model, "shift"):
                queryset = queryset.filter(shift__hotel_id=hotel)
        return queryset


class CashDrawerShiftViewSet(HotelScopedViewMixin, viewsets.ModelViewSet):
    serializer_class = CashDrawerShiftSerializer
    queryset = CashDrawerShift.objects.select_related("hotel", "opened_by", "closed_by").all()

    def get_queryset(self):
        queryset = self.queryset
        queryset = self.get_hotel_queryset(queryset)
        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)
        return queryset.order_by("-opened_at")

    def perform_create(self, serializer):
        serializer.save(opened_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="close")
    def close_shift(self, request, pk=None):
        shift = self.get_object()
        if shift.status == CashDrawerShift.Status.CLOSED:
            return Response({"detail": "Shift already closed."})
        counted_cash = request.data.get("counted_cash")
        expected_cash = request.data.get("expected_cash", shift.opening_cash)
        if counted_cash is None:
            return Response({"detail": "counted_cash is required."}, status=400)
        shift.counted_cash = Decimal(str(counted_cash))
        shift.expected_cash = Decimal(str(expected_cash))
        shift.closed_by = request.user
        shift.status = CashDrawerShift.Status.CLOSED
        shift.closed_at = timezone.now()
        shift.notes = request.data.get("notes", shift.notes)
        shift.save(update_fields=["counted_cash", "expected_cash", "closed_by", "status", "closed_at", "notes", "updated_at"])
        return Response(self.get_serializer(shift).data)


class CashDrawerEntryViewSet(HotelScopedViewMixin, viewsets.ModelViewSet):
    serializer_class = CashDrawerEntrySerializer
    queryset = CashDrawerEntry.objects.select_related("shift", "entered_by").all()

    def get_queryset(self):
        queryset = self.queryset
        queryset = self.get_hotel_queryset(queryset)
        shift = self.request.query_params.get("shift")
        if shift:
            queryset = queryset.filter(shift_id=shift)
        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        entry = serializer.save(entered_by=self.request.user)
        if entry.entry_type == CashDrawerEntry.EntryType.CASH_IN:
            entry.shift.expected_cash = (entry.shift.expected_cash or entry.shift.opening_cash) + entry.amount
        else:
            entry.shift.expected_cash = (entry.shift.expected_cash or entry.shift.opening_cash) - entry.amount
        entry.shift.save(update_fields=["expected_cash"])


class InventoryItemViewSet(HotelScopedViewMixin, viewsets.ModelViewSet):
    serializer_class = InventoryItemSerializer
    queryset = InventoryItem.objects.select_related("hotel").all()

    def get_queryset(self):
        queryset = self.get_hotel_queryset(self.queryset)
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__icontains=category)
        return queryset.order_by("name")


class InventoryMovementViewSet(HotelScopedViewMixin, viewsets.ModelViewSet):
    serializer_class = InventoryMovementSerializer
    queryset = InventoryMovement.objects.select_related("item", "recorded_by").all()

    def get_queryset(self):
        queryset = self.get_hotel_queryset(self.queryset)
        item = self.request.query_params.get("item")
        if item:
            queryset = queryset.filter(item_id=item)
        return queryset.order_by("-created_at")

    @transaction.atomic
    def perform_create(self, serializer):
        movement = serializer.save(recorded_by=self.request.user)
        item = movement.item
        if movement.movement_type in [InventoryMovement.MovementType.PURCHASE, InventoryMovement.MovementType.PRODUCTION, InventoryMovement.MovementType.ADJUSTMENT]:
            item.quantity = item.quantity + movement.quantity
        else:
            item.quantity = item.quantity - movement.quantity
        item.save(update_fields=["quantity", "updated_at"])


class ProductionRecordViewSet(HotelScopedViewMixin, viewsets.ModelViewSet):
    serializer_class = ProductionRecordSerializer
    queryset = ProductionRecord.objects.select_related("hotel", "item", "recorded_by").all()

    def get_queryset(self):
        queryset = self.get_hotel_queryset(self.queryset)
        outlet = self.request.query_params.get("outlet")
        if outlet:
            queryset = queryset.filter(outlet__icontains=outlet)
        return queryset.order_by("-produced_at")

    @transaction.atomic
    def perform_create(self, serializer):
        record = serializer.save(recorded_by=self.request.user)
        if record.item is not None:
            item = record.item
            item.quantity = item.quantity - record.quantity
            item.save(update_fields=["quantity", "updated_at"])
            InventoryMovement.objects.create(
                item=item,
                movement_type=InventoryMovement.MovementType.USAGE,
                quantity=record.quantity,
                unit_cost=item.unit_cost,
                notes=f"Production: {record.name}",
                recorded_by=self.request.user,
            )


class MarketingCampaignViewSet(HotelScopedViewMixin, viewsets.ModelViewSet):
    serializer_class = MarketingCampaignSerializer
    queryset = MarketingCampaign.objects.select_related("hotel", "created_by").all()

    def get_queryset(self):
        queryset = self.get_hotel_queryset(self.queryset)
        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)
        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class GuestFeedbackViewSet(HotelScopedViewMixin, viewsets.ModelViewSet):
    serializer_class = GuestFeedbackSerializer
    queryset = GuestFeedback.objects.select_related("hotel", "guest", "reservation", "recorded_by").all()

    def get_queryset(self):
        queryset = self.get_hotel_queryset(self.queryset)
        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)
        return queryset.order_by("-received_at")

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class IncidentReportViewSet(HotelScopedViewMixin, viewsets.ModelViewSet):
    serializer_class = IncidentReportSerializer
    queryset = IncidentReport.objects.select_related("hotel", "reported_by").all()

    def get_queryset(self):
        queryset = self.get_hotel_queryset(self.queryset)
        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)
        return queryset.order_by("-occurred_at")

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)
