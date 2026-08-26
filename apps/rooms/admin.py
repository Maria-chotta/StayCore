from django.contrib import admin
from .models import RoomType, Room


@admin.register(RoomType)
class RoomTypeAdmin(admin.ModelAdmin):

    list_display = (
        "name",
        "max_occupancy",
        "base_price",
        "is_active",
        "created_at",
    )

    list_filter = (
        "is_active",
    )

    search_fields = (
        "name",
    )


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):

    list_display = (
        "room_number",
        "hotel",
        "room_type",
        "floor",
        "status",
        "is_active",
    )

    list_filter = (
        "status",
        "floor",
        "is_active",
        "hotel",
        "room_type",
    )

    search_fields = (
        "room_number",
        "hotel__name",
    )