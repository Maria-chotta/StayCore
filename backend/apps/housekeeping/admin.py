from django.contrib import admin
from .models import HousekeepingTask


@admin.register(HousekeepingTask)
class HousekeepingTaskAdmin(admin.ModelAdmin):

    list_display = (
        "room",
        "task_type",
        "assigned_to",
        "priority",
        "status",
        "scheduled_for",
        "completed_at",
    )

    list_filter = (
        "task_type",
        "priority",
        "status",
        "hotel",
    )

    search_fields = (
        "room__room_number",
        "assigned_to__email",
        "notes",
    )

    date_hierarchy = "created_at"