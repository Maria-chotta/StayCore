from rest_framework import serializers

from .models import MaintenanceRequest
from apps.accounts.models import StaffMembership


class MaintenanceRequestSerializer(serializers.ModelSerializer):

    class HotelDisplaySerializer(serializers.Serializer):
        id = serializers.IntegerField(read_only=True)
        name = serializers.CharField(read_only=True)

    class RoomDisplaySerializer(serializers.Serializer):
        id = serializers.IntegerField(read_only=True)
        room_number = serializers.CharField(read_only=True)
        status = serializers.CharField(read_only=True)

    class UserDisplaySerializer(serializers.Serializer):
        id = serializers.IntegerField(read_only=True)
        email = serializers.CharField(read_only=True)
        first_name = serializers.CharField(read_only=True)
        last_name = serializers.CharField(read_only=True)

    hotel_details = HotelDisplaySerializer(source="hotel", read_only=True)
    room_details = RoomDisplaySerializer(source="room", read_only=True)
    reported_by_details = UserDisplaySerializer(source="reported_by", read_only=True)
    assigned_to_details = UserDisplaySerializer(source="assigned_to", read_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = [
            "id",
            "hotel",
            "hotel_details",
            "room",
            "room_details",
            "reported_by",
            "reported_by_details",
            "assigned_to",
            "assigned_to_details",
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

        extra_kwargs = {
            # The hotel is normally derived from the selected room
            # in validate(); clients should not be forced to send it.
            "hotel": {"required": False},
        }

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

        # The client does not always know the hotel id; derive it
        # from the room so PATCH requests without "hotel" validate.
        if room and not hotel:
            attrs["hotel"] = room.hotel
            hotel = room.hotel

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