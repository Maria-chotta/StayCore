from django.db import models


class HousekeepingTask(models.Model):

    class TaskType(models.TextChoices):
        CLEANING = "CLEANING", "Cleaning"
        DEEP_CLEANING = "DEEP_CLEANING", "Deep Cleaning"
        INSPECTION = "INSPECTION", "Inspection"
        LINEN_CHANGE = "LINEN_CHANGE", "Linen Change"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        NORMAL = "NORMAL", "Normal"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ASSIGNED = "ASSIGNED", "Assigned"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    hotel = models.ForeignKey(
        "hotels.Hotel",
        on_delete=models.CASCADE,
        related_name="housekeeping_tasks"
    )

    room = models.ForeignKey(
        "rooms.Room",
        on_delete=models.CASCADE,
        related_name="housekeeping_tasks"
    )

    assigned_to = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="housekeeping_tasks"
    )

    task_type = models.CharField(
        max_length=30,
        choices=TaskType.choices,
        default=TaskType.CLEANING
    )

    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    scheduled_for = models.DateTimeField(
        null=True,
        blank=True
    )

    started_at = models.DateTimeField(
        null=True,
        blank=True
    )

    completed_at = models.DateTimeField(
        null=True,
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

    def __str__(self):
        return f"{self.room} - {self.task_type} - {self.status}"