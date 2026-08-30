from django.db import models
from django.core.exceptions import ValidationError


class Reservation(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CHECKED_IN = "CHECKED_IN", "Checked In"
        CHECKED_OUT = "CHECKED_OUT", "Checked Out"
        CANCELLED = "CANCELLED", "Cancelled"
        NO_SHOW = "NO_SHOW", "No Show"

    hotel = models.ForeignKey(
        "hotels.Hotel",
        on_delete=models.CASCADE,
        related_name="reservations"
    )

    guest = models.ForeignKey(
        "guests.Guest",
        on_delete=models.PROTECT,
        related_name="reservations"
    )

    room = models.ForeignKey(
        "rooms.Room",
        on_delete=models.PROTECT,
        related_name="reservations"
    )

    check_in_date = models.DateField()

    check_out_date = models.DateField()

    actual_check_in = models.DateTimeField(
        null=True,
        blank=True
    )

    actual_check_out = models.DateTimeField(
        null=True,
        blank=True
    )

    checked_in_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="check_ins"
    )

    checked_out_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="check_outs"
    )

    adults = models.PositiveIntegerField(
        default=1
    )

    children = models.PositiveIntegerField(
        default=0
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    special_requests = models.TextField(
        blank=True
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

        if self.check_out_date <= self.check_in_date:
            raise ValidationError(
                "Check-out date must be after check-in date."
            )

        if self.hotel_id and self.room_id:

            if self.room.hotel_id != self.hotel_id:
                raise ValidationError(
                    "The selected room does not belong to this hotel."
                )

        if self.hotel_id and self.guest_id:

            if self.guest.hotel_id != self.hotel_id:
                raise ValidationError(
                    "The selected guest does not belong to this hotel."
                )

        if self.room_id:

            overlapping_reservations = Reservation.objects.filter(
                room=self.room,
                check_in_date__lt=self.check_out_date,
                check_out_date__gt=self.check_in_date,
            ).exclude(
                pk=self.pk
            ).exclude(
                status__in=[
                    self.Status.CANCELLED,
                    self.Status.NO_SHOW,
                ]
            )

            if overlapping_reservations.exists():

                raise ValidationError(
                    "This room is already reserved for the selected dates."
                )

    @property
    def number_of_nights(self):

        return (
            self.check_out_date -
            self.check_in_date
        ).days

    def __str__(self):

        return (
            f"{self.guest} - "
            f"Room {self.room.room_number} "
            f"({self.check_in_date} to "
            f"{self.check_out_date})"
        )