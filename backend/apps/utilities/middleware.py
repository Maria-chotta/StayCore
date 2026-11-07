from apps.accounts.models import StaffMembership
from apps.utilities.models import AuditLog


class AuditLogMiddleware:
    methods = {
        "POST": AuditLog.Action.CREATE,
        "PUT": AuditLog.Action.UPDATE,
        "PATCH": AuditLog.Action.UPDATE,
        "DELETE": AuditLog.Action.DELETE,
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        action = self.methods.get(request.method)
        if (
            action
            and request.path.startswith("/api/")
            and not request.path.startswith("/api/auth/")
            and not request.path.startswith("/api/audit-logs/")
            and not request.path.startswith("/api/utilities/")
            and response.status_code < 400
            and getattr(request, "user", None)
            and request.user.is_authenticated
        ):
            hotel = None
            hotel_id = request.META.get("HTTP_X_HOTEL_ID") or request.headers.get("X-Hotel-ID")
            memberships = StaffMembership.objects.filter(
                user=request.user,
                is_active=True,
            ).select_related("hotel")
            if hotel_id:
                hotel = memberships.filter(hotel_id=hotel_id).first()
            elif memberships.count() == 1:
                hotel = memberships.first()
            if hotel is not None:
                hotel = hotel.hotel
            path_parts = [part for part in request.path.strip("/").split("/") if part]
            resource = path_parts[-1] if path_parts else "api"
            if resource.isdigit() and len(path_parts) > 1:
                resource = path_parts[-2]
            AuditLog.objects.create(
                hotel=hotel,
                actor=request.user,
                action=action,
                resource=resource[:120],
                endpoint=request.path[:255],
                response_status=response.status_code,
            )
        return response
