from rest_framework import serializers

from .models import MaintenanceRequest
from apps.accounts.models import StaffMembership


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRequest
        fields = [
            "id",
            "hotel",
            "room",
            "reported_by",
            "assigned_to",
            "title",
            "description",
            "priority",
            "status",
            "reported_at",
            "resolved_at",
            "notes",
        ]

        read_only_fields = [
            "id",
            "reported_by",
            "reported_at",
            "resolved_at",
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

        # Validate assigned maintenance staff.
        if assigned_to and hotel:
            membership_exists = StaffMembership.objects.filter(
                user=assigned_to,
                hotel=hotel,
                role=StaffMembership.Role.MAINTENANCE,
                is_active=True,
            ).exists()

            if not membership_exists:
                raise serializers.ValidationError({
                    "assigned_to": (
                        "This user is not an active maintenance "
                        "staff member for the selected hotel."
                    )
                })

        return attrs