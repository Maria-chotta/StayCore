from apps.accounts.models import StaffMembership


OWNER = StaffMembership.Role.OWNER
MANAGER = StaffMembership.Role.MANAGER
RECEPTIONIST = StaffMembership.Role.RECEPTIONIST
ACCOUNTANT = StaffMembership.Role.ACCOUNTANT
HOUSEKEEPER = StaffMembership.Role.HOUSEKEEPER
MAINTENANCE = StaffMembership.Role.MAINTENANCE


def has_hotel_role(user, hotel, allowed_roles):

    if not user.is_authenticated:
        return False

    return StaffMembership.objects.filter(
        user=user,
        hotel=hotel,
        role__in=allowed_roles,
        is_active=True
    ).exists()
