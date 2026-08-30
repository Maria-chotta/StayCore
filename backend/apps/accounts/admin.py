from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, StaffMembership


@admin.register(User)
class CustomUserAdmin(UserAdmin):

    model = User

    list_display = (
        "email",
        "first_name",
        "last_name",
        "is_staff",
        "is_active",
    )

    ordering = ("email",)

    fieldsets = (
        (None, {
            "fields": (
                "email",
                "password",
            )
        }),
        ("Personal information", {
            "fields": (
                "first_name",
                "last_name",
                "phone",
            )
        }),
        ("Permissions", {
            "fields": (
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            )
        }),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email",
                "password1",
                "password2",
                "is_staff",
                "is_active",
            ),
        }),
    )


@admin.register(StaffMembership)
class StaffMembershipAdmin(admin.ModelAdmin):

    list_display = (
        "user",
        "hotel",
        "role",
        "is_active",
        "created_at",
    )

    list_filter = (
        "role",
        "is_active",
    )

    search_fields = (
        "user__email",
        "hotel__name",
    )