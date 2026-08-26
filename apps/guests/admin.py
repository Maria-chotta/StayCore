from django.contrib import admin
from .models import Guest


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):

    list_display = (
        "first_name",
        "last_name",
        "phone",
        "email",
        "nationality",
        "hotel",
        "is_active",
        "created_at",
    )

    list_filter = (
        "gender",
        "nationality",
        "country",
        "is_active",
        "hotel",
    )

    search_fields = (
        "first_name",
        "last_name",
        "email",
        "phone",
        "identification_number",
    )