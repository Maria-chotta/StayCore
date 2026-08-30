from rest_framework import serializers

from .models import Room, RoomType


class RoomTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomType

        fields = [
            "id",
            "name",
            "description",
            "max_occupancy",
            "base_price",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


from apps.accounts.models import StaffMembership


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room

        fields = [
            "id",
            "hotel",
            "room_type",
            "room_number",
            "floor",
            "status",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication is required.")

        hotel = attrs.get(
            "hotel",
            self.instance.hotel if self.instance else None
        )

        if hotel:
            has_access = StaffMembership.objects.filter(
                user=request.user,
                hotel=hotel,
                is_active=True,
            ).exists()
            if not has_access:
                raise serializers.ValidationError({
                    "hotel": "You do not have access to this hotel."
                })

        room_type = attrs.get(
            "room_type",
            self.instance.room_type if self.instance else None
        )

        if room_type and not room_type.is_active:
            raise serializers.ValidationError({
                "room_type": "This room type is inactive."
            })

        return attrs