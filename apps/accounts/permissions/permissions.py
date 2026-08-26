from rest_framework.permissions import BasePermission

from apps.accounts.models import StaffMembership


class IsHotelStaff(BasePermission):
    """
    Allows authenticated users who belong to at least
    one hotel through an active StaffMembership.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return StaffMembership.objects.filter(
            user=request.user,
            is_active=True,
        ).exists()


class HasHotelRole(BasePermission):
    """
    Allows access when the authenticated user has one
    of the roles specified by the ViewSet.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        allowed_roles = getattr(view, "allowed_roles", [])

        if not allowed_roles:
            return False

        return StaffMembership.objects.filter(
            user=request.user,
            is_active=True,
            role__in=allowed_roles,
        ).exists()


class IsSameHotel(BasePermission):
    """
    Ensures the user belongs to the same hotel as the object.
    """

    def has_object_permission(self, request, view, obj):
        hotel = getattr(obj, "hotel", None)

        if not hotel:
            return False

        return StaffMembership.objects.filter(
            user=request.user,
            hotel=hotel,
            is_active=True,
        ).exists()


class IsOwnerOrManager(BasePermission):
    """
    Allows only hotel owners and managers.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return StaffMembership.objects.filter(
            user=request.user,
            is_active=True,
            role__in=[
                StaffMembership.Role.OWNER,
                StaffMembership.Role.MANAGER,
            ],
        ).exists()


class IsReceptionistOrAbove(BasePermission):
    """
    Allows owners, managers and receptionists.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return StaffMembership.objects.filter(
            user=request.user,
            is_active=True,
            role__in=[
                StaffMembership.Role.OWNER,
                StaffMembership.Role.MANAGER,
                StaffMembership.Role.RECEPTIONIST,
            ],
        ).exists()


class IsAccountantOrAbove(BasePermission):
    """
    Allows owners, managers and accountants.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return StaffMembership.objects.filter(
            user=request.user,
            is_active=True,
            role__in=[
                StaffMembership.Role.OWNER,
                StaffMembership.Role.MANAGER,
                StaffMembership.Role.ACCOUNTANT,
            ],
        ).exists()


class IsHousekeeper(BasePermission):
    """
    Allows owners, managers and housekeepers.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return StaffMembership.objects.filter(
            user=request.user,
            is_active=True,
            role__in=[
                StaffMembership.Role.OWNER,
                StaffMembership.Role.MANAGER,
                StaffMembership.Role.HOUSEKEEPER,
            ],
        ).exists()


class IsMaintenanceStaff(BasePermission):
    """
    Allows owners, managers and maintenance staff.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return StaffMembership.objects.filter(
            user=request.user,
            is_active=True,
            role__in=[
                StaffMembership.Role.OWNER,
                StaffMembership.Role.MANAGER,
                StaffMembership.Role.MAINTENANCE,
            ],
        ).exists()

