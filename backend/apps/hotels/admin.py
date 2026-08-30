from django.contrib import admin
from .models import Hotel


@admin.register(Hotel)
class HotelAdmin(admin.ModelAdmin):

    list_display = (
        "name",
        "city",
        "country",
        "currency",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "country",
    )

    search_fields = (
        "name",
        "city",
        "email",
    )