from django.contrib import admin
from .models import Reservation


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):

    list_display = (
        "guest",
        "hotel",
        "room",
        "check_in_date",
        "check_out_date",
        "status",
        "actual_check_in",
        "actual_check_out",
    )

    list_filter = (
        "status",
        "hotel",
        "check_in_date",
        "check_out_date",
    )

    search_fields = (
        "guest__first_name",
        "guest__last_name",
        "guest__email",
        "room__room_number",
    )

    date_hierarchy = "check_in_date"

    readonly_fields = (
        "actual_check_in",
        "actual_check_out",
    )