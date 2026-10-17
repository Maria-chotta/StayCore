from rest_framework import serializers

from .models import EventPackage, GroupBooking, RatePlan, Room, RoomType


class GroupBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupBooking
        fields = [
            "id",
            "hotel",
            "name",
            "contact_name",
            "contact_phone",
            "group_size",
            "start_date",
            "end_date",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication is required.")

        hotel = attrs.get("hotel", self.instance.hotel if self.instance else None)
        if hotel is not None:
            if request.user.resolve_hotel_context(request, explicit_hotel=hotel) is None:
                raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})

        if hotel is not None and not request.user.has_hotel_access(hotel.id if hasattr(hotel, "id") else hotel):
            raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})

        if attrs.get("start_date") and attrs.get("end_date") and attrs["start_date"] > attrs["end_date"]:
            raise serializers.ValidationError({"end_date": "End date must be on or after the start date."})

        return attrs


class EventPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventPackage
        fields = [
            "id",
            "hotel",
            "name",
            "description",
            "price",
            "capacity",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication is required.")

        hotel = attrs.get("hotel", self.instance.hotel if self.instance else None)
        if hotel is not None:
            resolved_hotel_id = request.user.resolve_hotel_context(request, explicit_hotel=hotel)
            if resolved_hotel_id is None:
                raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})
            hotel_id = getattr(hotel, "id", hotel)
            if str(hotel_id) != str(resolved_hotel_id):
                raise serializers.ValidationError({"hotel": "The selected hotel does not match the active hotel context."})

        from apps.accounts.models import StaffMembership
        if hotel and not StaffMembership.objects.filter(user=request.user, hotel=hotel, is_active=True).exists():
            raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})

        return attrs


class RatePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = RatePlan
        fields = [
            "id",
            "hotel",
            "name",
            "description",
            "rate_type",
            "price",
            "start_date",
            "end_date",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication is required.")

        hotel = attrs.get("hotel", self.instance.hotel if self.instance else None)
        if hotel is not None:
            resolved_hotel_id = request.user.resolve_hotel_context(request, explicit_hotel=hotel)
            if resolved_hotel_id is None:
                raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})
            hotel_id = getattr(hotel, "id", hotel)
            if str(hotel_id) != str(resolved_hotel_id):
                raise serializers.ValidationError({"hotel": "The selected hotel does not match the active hotel context."})

        from apps.accounts.models import StaffMembership
        if hotel and not StaffMembership.objects.filter(user=request.user, hotel=hotel, is_active=True).exists():
            raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})

        if attrs.get("start_date") and attrs.get("end_date") and attrs["start_date"] > attrs["end_date"]:
            raise serializers.ValidationError({"end_date": "End date must be on or after the start date."})

        return attrs


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

        try:
            resolved_hotel_id = request.user.resolve_hotel_context(request, explicit_hotel=hotel)
            if hotel is not None and resolved_hotel_id is not None:
                hotel_id = getattr(hotel, "id", hotel)
                if str(hotel_id) != str(resolved_hotel_id):
                    raise serializers.ValidationError({
                        "hotel": "The selected hotel does not match the active hotel context."
                    })
        except Exception:
            raise

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