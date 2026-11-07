from decimal import Decimal

from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator


class GroupBooking(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    hotel = models.ForeignKey(
        "hotels.Hotel",
        on_delete=models.CASCADE,
        related_name="group_bookings"
    )
    reservations = models.ManyToManyField(
        "reservations.Reservation",
        related_name="group_bookings",
        blank=True,
    )

    name = models.CharField(max_length=200)
    contact_name = models.CharField(max_length=200)
    contact_phone = models.CharField(max_length=30, blank=True)
    group_size = models.PositiveIntegerField(default=1)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class EventPackage(models.Model):

    hotel = models.ForeignKey(
        "hotels.Hotel",
        on_delete=models.CASCADE,
        related_name="event_packages"
    )

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    capacity = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ScheduledEvent(models.Model):

    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planned"
        CONFIRMED = "CONFIRMED", "Confirmed"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    hotel = models.ForeignKey(
        "hotels.Hotel",
        on_delete=models.CASCADE,
        related_name="scheduled_events",
    )
    package = models.ForeignKey(
        EventPackage,
        on_delete=models.SET_NULL,
        related_name="scheduled_events",
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=200)
    venue = models.CharField(max_length=200)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNED,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class EventParticipant(models.Model):

    class Status(models.TextChoices):
        INVITED = "INVITED", "Invited"
        CONFIRMED = "CONFIRMED", "Confirmed"
        DECLINED = "DECLINED", "Declined"
        ATTENDED = "ATTENDED", "Attended"

    event = models.ForeignKey(
        ScheduledEvent,
        on_delete=models.CASCADE,
        related_name="participants",
    )
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.INVITED,
    )


class EventCharge(models.Model):
    event = models.ForeignKey(
        ScheduledEvent,
        on_delete=models.CASCADE,
        related_name="charges",
    )
    description = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)

    @property
    def total(self):
        return self.quantity * self.unit_price


class RatePlan(models.Model):

    class Type(models.TextChoices):
        GROUP = "GROUP", "Group"
        WEEKEND = "WEEKEND", "Weekend"
        SPECIAL = "SPECIAL", "Special"
        CORPORATE = "CORPORATE", "Corporate"

    class MealPlan(models.TextChoices):
        ROOM_ONLY = "ROOM_ONLY", "Room only"
        BREAKFAST = "BREAKFAST", "Breakfast included"
        HALF_BOARD = "HALF_BOARD", "Half board"
        FULL_BOARD = "FULL_BOARD", "Full board"
        ALL_INCLUSIVE = "ALL_INCLUSIVE", "All inclusive"

    hotel = models.ForeignKey(
        "hotels.Hotel",
        on_delete=models.CASCADE,
        related_name="rate_plans"
    )

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    rate_type = models.CharField(
        max_length=20,
        choices=Type.choices,
        default=Type.SPECIAL,
    )
    price = models.DecimalField(max_digits=12, decimal_places=2)
    meal_plan = models.CharField(
        max_length=20,
        choices=MealPlan.choices,
        default=MealPlan.ROOM_ONLY,
    )
    cancellation_deadline_hours = models.PositiveIntegerField(default=24)
    cancellation_fee_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
    )
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class RoomType(models.Model):

    name = models.CharField(
        max_length=100
    )

    description = models.TextField(
        blank=True
    )

    max_occupancy = models.PositiveIntegerField(
        default=2
    )

    base_price = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.name


class Room(models.Model):

    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        OCCUPIED = "OCCUPIED", "Occupied"
        DIRTY = "DIRTY", "Dirty"
        CLEANING = "CLEANING", "Cleaning"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        OUT_OF_ORDER = "OUT_OF_ORDER", "Out of Order"

    hotel = models.ForeignKey(
        "hotels.Hotel",
        on_delete=models.CASCADE,
        related_name="rooms"
    )

    room_type = models.ForeignKey(
        RoomType,
        on_delete=models.PROTECT,
        related_name="rooms"
    )

    room_number = models.CharField(
        max_length=20
    )

    floor = models.PositiveIntegerField(
        default=1
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.AVAILABLE
    )

    is_active = models.BooleanField(
        default=True
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

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["hotel", "room_number"],
                name="unique_room_number_per_hotel"
            )
        ]

    def __str__(self):
        return f"{self.hotel.name} - Room {self.room_number}"