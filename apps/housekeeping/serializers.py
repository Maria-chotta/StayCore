from rest_framework import serializers

from .models import HousekeepingTask
from apps.accounts.models import StaffMembership


class HousekeepingTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = HousekeepingTask

        fields = [
            "id",
            "hotel",
            "room",
            "assigned_to",
            "task_type",
            "priority",
            "status",
            "scheduled_for",
            "started_at",
            "completed_at",
            "notes",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "started_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        hotel = attrs.get(
            "hotel",
            self.instance.hotel if self.instance else None
        )

        room = attrs.get(
            "room",
            self.instance.room if self.instance else None
        )

        assigned_to = attrs.get(
            "assigned_to",
            self.instance.assigned_to if self.instance else None
        )

        # Make sure the room belongs to the selected hotel.
        if room and hotel and room.hotel_id != hotel.id:
            raise serializers.ValidationError({
                "room": "This room does not belong to the selected hotel."
            })

        # Make sure assigned staff is an active housekeeper
        # belonging to the same hotel.
        if assigned_to and hotel:
            membership_exists = StaffMembership.objects.filter(
                user=assigned_to,
                hotel=hotel,
                role=StaffMembership.Role.HOUSEKEEPER,
                is_active=True,
            ).exists()

            if not membership_exists:
                raise serializers.ValidationError({
                    "assigned_to": (
                        "This user is not an active housekeeper "
                        "for the selected hotel."
                    )
                })

        return attrs
