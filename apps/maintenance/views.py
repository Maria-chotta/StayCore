from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import MaintenanceRequest
from .serializers import MaintenanceRequestSerializer
from apps.rooms.models import Room


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = MaintenanceRequest.objects.select_related(
            "hotel",
            "room",
            "reported_by",
            "assigned_to",
        ).all()

        status = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        room = self.request.query_params.get("room")
        assigned_to = self.request.query_params.get("assigned_to")

        if status:
            queryset = queryset.filter(status=status)

        if priority:
            queryset = queryset.filter(priority=priority)

        if room:
            queryset = queryset.filter(room_id=room)

        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

        return queryset

    def perform_create(self, serializer):
        maintenance_request = serializer.save(
            reported_by=self.request.user
        )

        if maintenance_request.room:
            maintenance_request.room.status = Room.Status.MAINTENANCE
            maintenance_request.room.save(
                update_fields=["status", "updated_at"]
            )

    def perform_update(self, serializer):
        old_status = serializer.instance.status

        maintenance_request = serializer.save()

        room = maintenance_request.room

        # Set resolved time when request becomes resolved
        if (
            old_status != "RESOLVED"
            and maintenance_request.status == "RESOLVED"
        ):
            maintenance_request.resolved_at = timezone.now()
            maintenance_request.save(
                update_fields=["resolved_at"]
            )

        if not room:
            return

        # Active maintenance means the room remains in maintenance.
        if maintenance_request.status in ["OPEN", "IN_PROGRESS"]:
            if room.status != Room.Status.MAINTENANCE:
                room.status = Room.Status.MAINTENANCE
                room.save(
                    update_fields=["status", "updated_at"]
                )

        # When resolved, make room available only if
        # there are no other active maintenance requests.
        elif (
            old_status != "RESOLVED"
            and maintenance_request.status == "RESOLVED"
        ):
            other_active_requests = MaintenanceRequest.objects.filter(
                room=room,
                status__in=["OPEN", "IN_PROGRESS"],
            ).exclude(
                id=maintenance_request.id
            ).exists()

            if not other_active_requests:
                room.status = Room.Status.AVAILABLE
                room.save(
                    update_fields=["status", "updated_at"]
                )