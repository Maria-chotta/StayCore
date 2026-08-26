from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Folio(models.Model):

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
        PAID = "PAID", "Paid"
        VOID = "VOID", "Void"

    reservation = models.OneToOneField(
        "reservations.Reservation",
        on_delete=models.CASCADE,
        related_name="folio"
    )

    hotel = models.ForeignKey(
        "hotels.Hotel",
        on_delete=models.CASCADE,
        related_name="folios"
    )

    guest = models.ForeignKey(
        "guests.Guest",
        on_delete=models.PROTECT,
        related_name="folios"
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN
    )

    notes = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def clean(self):
        if (
            self.reservation_id
            and self.hotel_id
            and self.reservation.hotel_id != self.hotel_id
        ):
            raise ValidationError(
                "The folio hotel must match the reservation hotel."
            )

        if (
            self.reservation_id
            and self.guest_id
            and self.reservation.guest_id != self.guest_id
        ):
            raise ValidationError(
                "The folio guest must match the reservation guest."
            )

    @property
    def total_charges(self):
        return sum(
            (
                item.total
                for item in self.line_items.all()
            ),
            Decimal("0.00")
        )

    @property
    def total_paid(self):
        return sum(
            (
                payment.amount
                for payment in self.payments.filter(
                    status=Payment.Status.COMPLETED
                )
            ),
            Decimal("0.00")
        )

    @property
    def balance(self):
        return self.total_charges - self.total_paid

    def __str__(self):
        return f"Folio #{self.id} - {self.guest}"


class FolioItem(models.Model):

    class ItemType(models.TextChoices):
        ROOM = "ROOM", "Room"
        SERVICE = "SERVICE", "Service"
        FOOD = "FOOD", "Food"
        TAX = "TAX", "Tax"
        DISCOUNT = "DISCOUNT", "Discount"
        OTHER = "OTHER", "Other"

    folio = models.ForeignKey(
        Folio,
        on_delete=models.CASCADE,
        related_name="line_items"
    )

    description = models.CharField(
        max_length=255
    )

    item_type = models.CharField(
        max_length=20,
        choices=ItemType.choices,
        default=ItemType.OTHER
    )

    quantity = models.PositiveIntegerField(
        default=1
    )

    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    @property
    def total(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"{self.description} - {self.total}"


class Payment(models.Model):

    class Method(models.TextChoices):
        CASH = "CASH", "Cash"
        CARD = "CARD", "Card"
        MPESA = "MPESA", "M-Pesa"
        TIGOPESA = "TIGOPESA", "Tigo Pesa"
        AIRTEL_MONEY = "AIRTEL_MONEY", "Airtel Money"
        BANK = "BANK", "Bank Transfer"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    folio = models.ForeignKey(
        Folio,
        on_delete=models.PROTECT,
        related_name="payments"
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    method = models.CharField(
        max_length=30,
        choices=Method.choices
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED
    )

    reference = models.CharField(
        max_length=100,
        blank=True
    )

    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_payments"
    )

    paid_at = models.DateTimeField(
        auto_now_add=True
    )

    notes = models.TextField(
        blank=True
    )

    def clean(self):
        if self.amount <= 0:
            raise ValidationError(
                "Payment amount must be greater than zero."
            )

        if self.folio_id:
            if self.folio.balance < 0:
                raise ValidationError(
                    "This folio is already fully paid."
                )

            if self.amount > self.folio.balance:
                raise ValidationError(
                    "Payment cannot exceed the outstanding balance."
                )

    def __str__(self):
        return (
            f"{self.amount} - "
            f"{self.method} - "
            f"{self.status}"
        )
