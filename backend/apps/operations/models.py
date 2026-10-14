from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class CashDrawerShift(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"

    hotel = models.ForeignKey("hotels.Hotel", on_delete=models.CASCADE, related_name="cash_drawer_shifts")
    opened_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="opened_cash_shifts")
    closed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="closed_cash_shifts")
    opening_cash = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    counted_cash = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-opened_at"]


class CashDrawerEntry(models.Model):
    class EntryType(models.TextChoices):
        CASH_IN = "CASH_IN", "Cash in"
        CASH_OUT = "CASH_OUT", "Cash out"

    shift = models.ForeignKey(CashDrawerShift, on_delete=models.CASCADE, related_name="entries")
    entry_type = models.CharField(max_length=10, choices=EntryType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])
    description = models.CharField(max_length=255)
    entered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class InventoryItem(models.Model):
    hotel = models.ForeignKey("hotels.Hotel", on_delete=models.CASCADE, related_name="inventory_items")
    name = models.CharField(max_length=150)
    sku = models.CharField(max_length=60, blank=True)
    category = models.CharField(max_length=80, blank=True)
    unit = models.CharField(max_length=30, default="each")
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0, validators=[MinValueValidator(0)])
    reorder_level = models.DecimalField(max_digits=12, decimal_places=3, default=0, validators=[MinValueValidator(0)])
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["hotel", "sku"], condition=~models.Q(sku=""), name="unique_inventory_sku_per_hotel")]


class InventoryMovement(models.Model):
    class MovementType(models.TextChoices):
        PURCHASE = "PURCHASE", "Purchase"
        USAGE = "USAGE", "Usage"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"
        PRODUCTION = "PRODUCTION", "Production"

    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, related_name="movements")
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, validators=[MinValueValidator(0.001)])
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    notes = models.CharField(max_length=255, blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ProductionRecord(models.Model):
    hotel = models.ForeignKey("hotels.Hotel", on_delete=models.CASCADE, related_name="production_records")
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, null=True, blank=True, related_name="production_records")
    name = models.CharField(max_length=150)
    outlet = models.CharField(max_length=100, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, validators=[MinValueValidator(0.001)])
    unit = models.CharField(max_length=30, default="servings")
    produced_at = models.DateTimeField()
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-produced_at"]


class MarketingCampaign(models.Model):
    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planned"
        ACTIVE = "ACTIVE", "Active"
        COMPLETED = "COMPLETED", "Completed"
        PAUSED = "PAUSED", "Paused"

    hotel = models.ForeignKey("hotels.Hotel", on_delete=models.CASCADE, related_name="marketing_campaigns")
    name = models.CharField(max_length=150)
    channel = models.CharField(max_length=80, blank=True)
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    starts_on = models.DateField(null=True, blank=True)
    ends_on = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PLANNED)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class GuestFeedback(models.Model):
    class Status(models.TextChoices):
        NEW = "NEW", "New"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        RESOLVED = "RESOLVED", "Resolved"

    hotel = models.ForeignKey("hotels.Hotel", on_delete=models.CASCADE, related_name="guest_feedback")
    guest = models.ForeignKey("guests.Guest", on_delete=models.SET_NULL, null=True, blank=True, related_name="feedback")
    reservation = models.ForeignKey("reservations.Reservation", on_delete=models.SET_NULL, null=True, blank=True, related_name="feedback")
    rating = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1)])
    category = models.CharField(max_length=80, blank=True)
    comment = models.TextField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW)
    follow_up_notes = models.TextField(blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    class Meta:
        ordering = ["-received_at"]


class IncidentReport(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        UNDER_REVIEW = "UNDER_REVIEW", "Under review"
        CLOSED = "CLOSED", "Closed"

    hotel = models.ForeignKey("hotels.Hotel", on_delete=models.CASCADE, related_name="incident_reports")
    incident_type = models.CharField(max_length=80)
    occurred_at = models.DateTimeField()
    location = models.CharField(max_length=150)
    description = models.TextField()
    action_taken = models.TextField(blank=True)
    police_reference = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-occurred_at"]