from django.utils import timezone

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import HousekeepingTask
from .serializers import HousekeepingTaskSerializer
from apps.rooms.models import Room


class HousekeepingTaskViewSet(viewsets.ModelViewSet):
    serializer_class = HousekeepingTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = HousekeepingTask.objects.select_related(
            "hotel",
            "room",
            "assigned_to",
        ).all()

        status = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        room = self.request.query_params.get("room")
        assigned_to = self.request.query_params.get("assigned_to")
        task_type = self.request.query_params.get("task_type")

        if status:
            queryset = queryset.filter(status=status)

        if priority:
            queryset = queryset.filter(priority=priority)

        if room:
            queryset = queryset.filter(room_id=room)

        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

        if task_type:
            queryset = queryset.filter(task_type=task_type)

        return queryset

    def perform_create(self, serializer):
        task = serializer.save()

        if task.room:
            task.room.status = Room.Status.DIRTY
            task.room.save(
                update_fields=["status", "updated_at"]
            )

    def perform_update(self, serializer):
        old_status = serializer.instance.status

        task = serializer.save()

        room = task.room

        if not room:
            return

        # When housekeeping starts.
        if (
            old_status != "IN_PROGRESS"
            and task.status == "IN_PROGRESS"
        ):
            if not task.started_at:
                task.started_at = timezone.now()
                task.save(update_fields=["started_at"])

            room.status = Room.Status.CLEANING
            room.save(
                update_fields=["status", "updated_at"]
            )

        # When housekeeping is completed.
        elif (
            old_status != "COMPLETED"
            and task.status == "COMPLETED"
        ):
            task.completed_at = timezone.now()
            task.save(update_fields=["completed_at"])

            room.status = Room.Status.AVAILABLE
            room.save(
                update_fields=["status", "updated_at"]
            )
