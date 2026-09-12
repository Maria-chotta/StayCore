from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from .models import Folio, FolioItem, Payment
from .serializers import (
    FolioSerializer,
    FolioItemSerializer,
    PaymentSerializer,
)


from apps.accounts.models import StaffMembership


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
