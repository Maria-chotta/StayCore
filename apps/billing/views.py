from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Folio, FolioItem, Payment
from .serializers import (
    FolioSerializer,
    FolioItemSerializer,
    PaymentSerializer,
)


class FolioViewSet(viewsets.ModelViewSet):
    queryset = Folio.objects.select_related(
        "reservation",
        "hotel",
        "guest",
    ).all()

    serializer_class = FolioSerializer
    permission_classes = [IsAuthenticated]


class FolioItemViewSet(viewsets.ModelViewSet):
    queryset = FolioItem.objects.select_related(
        "folio",
    ).all()

    serializer_class = FolioItemSerializer
    permission_classes = [IsAuthenticated]


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related(
        "folio",
        "received_by",
    ).all()

    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

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
