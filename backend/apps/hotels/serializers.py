from rest_framework import serializers

from .models import Hotel


class HotelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hotel

        fields = [
            "id",
            "name",
            "description",
            "address",
            "city",
            "country",
            "phone",
            "email",
            "currency",
            "timezone",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]
