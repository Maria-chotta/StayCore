from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from zoneinfo import ZoneInfo

from .models import Folio, FolioItem, Payment
from .serializers import (
    FolioSerializer,
    FolioItemSerializer,
    PaymentSerializer,
)


from apps.accounts.models import StaffMembership
from apps.accounting.services import ensure_business_day_open, hotel_local_date


class FolioViewSet(viewsets.ModelViewSet):
    serializer_class = FolioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_ids = StaffMembership.objects.filter(
            user=self.request.user,
            is_active=True,
        ).values_list("hotel_id", flat=True)
        queryset = Folio.objects.select_related(
            "reservation",
            "hotel",
            "guest",
        ).filter(hotel_id__in=hotel_ids)

        hotel = self.request.user.resolve_hotel_context(self.request)
        if hotel is not None:
            queryset = queryset.filter(hotel_id=hotel)

        return queryset


class FolioItemViewSet(viewsets.ModelViewSet):
    serializer_class = FolioItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_ids = StaffMembership.objects.filter(
            user=self.request.user,
            is_active=True,
        ).values_list("hotel_id", flat=True)
        queryset = FolioItem.objects.select_related(
            "folio",
        ).filter(folio__hotel_id__in=hotel_ids)

        hotel = self.request.user.resolve_hotel_context(self.request)
        if hotel is not None:
            queryset = queryset.filter(folio__hotel_id=hotel)

        return queryset


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_ids = StaffMembership.objects.filter(
            user=self.request.user,
            is_active=True,
        ).values_list("hotel_id", flat=True)
        queryset = Payment.objects.select_related(
            "folio",
            "received_by",
        ).filter(folio__hotel_id__in=hotel_ids)

        hotel = self.request.user.resolve_hotel_context(self.request)
        if hotel is not None:
            queryset = queryset.filter(folio__hotel_id=hotel)

        return queryset

    def perform_create(self, serializer):
        hotel = serializer.validated_data["folio"].hotel
        try:
            ensure_business_day_open(hotel, hotel_local_date(hotel))
        except DjangoValidationError as exc:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(exc.message_dict) from exc
        payment = serializer.save(
            received_by=self.request.user
        )

        folio = payment.folio

        if payment.status == Payment.Status.COMPLETED:
            if folio.balance <= 0:
                folio.status = Folio.Status.PAID
            elif folio.total_paid > 0:
                folio.status = Folio.Status.PARTIALLY_PAID
            else:
                folio.status = Folio.Status.OPEN

            folio.save(
                update_fields=["status", "updated_at"]
            )

    def perform_update(self, serializer):
        payment = self.get_object()
        hotel = payment.folio.hotel
        paid_date = timezone.localtime(payment.paid_at, ZoneInfo(hotel.timezone)).date()
        try:
            ensure_business_day_open(hotel, paid_date)
        except DjangoValidationError as exc:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(exc.message_dict) from exc
        serializer.save()

    def perform_destroy(self, instance):
        hotel = instance.folio.hotel
        paid_date = timezone.localtime(instance.paid_at, ZoneInfo(hotel.timezone)).date()
        try:
            ensure_business_day_open(hotel, paid_date)
        except DjangoValidationError as exc:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(exc.message_dict) from exc
        instance.delete()
