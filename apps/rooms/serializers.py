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
        hotel = attrs.get(
            "hotel",
            self.instance.hotel if self.instance else None
        )

        room_type = attrs.get(
            "room_type",
            self.instance.room_type if self.instance else None
        )

        if room_type and not room_type.is_active:
            raise serializers.ValidationError({
                "room_type": "This room type is inactive."
            })

        if hotel and room_type:
            # Room types are currently global,
            # so no hotel ownership check is required here.
            pass

        return attrs