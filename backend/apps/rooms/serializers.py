from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from .models import (
    EventCharge,
    EventPackage,
    EventParticipant,
    GroupBooking,
    RatePlan,
    Room,
    RoomType,
    ScheduledEvent,
)
from apps.reservations.models import Reservation


class GroupBookingSerializer(serializers.ModelSerializer):
    reservation_ids = serializers.PrimaryKeyRelatedField(
        queryset=Reservation.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )
    reservations = serializers.SerializerMethodField()

    class Meta:
        model = GroupBooking
        fields = [
            "id",
            "hotel",
            "reservation_ids",
            "reservations",
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

        start_date = attrs.get("start_date", self.instance.start_date if self.instance else None)
        end_date = attrs.get("end_date", self.instance.end_date if self.instance else None)
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({"end_date": "End date must be on or after the start date."})

        reservations = attrs.get("reservation_ids")
        if reservations is None and self.instance:
            reservations = self.instance.reservations.all()
        for reservation in reservations or []:
            if hotel is None or reservation.hotel_id != hotel.id:
                raise serializers.ValidationError({"reservation_ids": "All linked reservations must belong to this hotel."})
            if start_date and end_date and (
                reservation.check_in_date < start_date
                or reservation.check_out_date > end_date
            ):
                raise serializers.ValidationError({"reservation_ids": "Linked reservation dates must fall within the group stay dates."})

        return attrs

    def get_reservations(self, group):
        return [
            {
                "id": reservation.id,
                "guest": f"{reservation.guest.first_name} {reservation.guest.last_name}".strip(),
                "room": reservation.room.room_number,
                "check_in_date": reservation.check_in_date,
                "check_out_date": reservation.check_out_date,
                "status": reservation.status,
            }
            for reservation in group.reservations.select_related("guest", "room").order_by("check_in_date")
        ]

    def create(self, validated_data):
        reservations = validated_data.pop("reservation_ids", [])
        group = GroupBooking.objects.create(**validated_data)
        group.reservations.set(reservations)
        return group

    def update(self, instance, validated_data):
        reservations = validated_data.pop("reservation_ids", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if reservations is not None:
            instance.reservations.set(reservations)
        return instance


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


class EventParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventParticipant
        fields = ["id", "name", "email", "phone", "status"]
        read_only_fields = ["id"]


class EventChargeSerializer(serializers.ModelSerializer):
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.00"))
    total = serializers.ReadOnlyField()

    class Meta:
        model = EventCharge
        fields = ["id", "description", "quantity", "unit_price", "total"]
        read_only_fields = ["id", "total"]


class ScheduledEventSerializer(serializers.ModelSerializer):
    participants = EventParticipantSerializer(many=True, required=False)
    charges = EventChargeSerializer(many=True, required=False)
    charge_total = serializers.SerializerMethodField()

    class Meta:
        model = ScheduledEvent
        fields = [
            "id",
            "hotel",
            "package",
            "name",
            "venue",
            "start_at",
            "end_at",
            "status",
            "notes",
            "participants",
            "charges",
            "charge_total",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "charge_total"]

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication is required.")

        hotel = attrs.get("hotel", self.instance.hotel if self.instance else None)
        if hotel is not None:
            resolved_hotel_id = request.user.resolve_hotel_context(request, explicit_hotel=hotel)
            if resolved_hotel_id is None or str(hotel.id) != str(resolved_hotel_id):
                raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})
            if not StaffMembership.objects.filter(
                user=request.user,
                hotel=hotel,
                is_active=True,
            ).exists():
                raise serializers.ValidationError({"hotel": "You do not have access to this hotel."})

        package = attrs.get("package", self.instance.package if self.instance else None)
        if package and hotel and package.hotel_id != hotel.id:
            raise serializers.ValidationError({"package": "The event package must belong to this hotel."})

        start_at = attrs.get("start_at", self.instance.start_at if self.instance else None)
        end_at = attrs.get("end_at", self.instance.end_at if self.instance else None)
        if start_at and end_at and end_at <= start_at:
            raise serializers.ValidationError({"end_at": "Event end must be after its start."})
        return attrs

    def get_charge_total(self, event):
        return sum((charge.total for charge in event.charges.all()), start=Decimal("0.00"))

    @transaction.atomic
    def create(self, validated_data):
        participants = validated_data.pop("participants", [])
        charges = validated_data.pop("charges", [])
        event = ScheduledEvent.objects.create(**validated_data)
        EventParticipant.objects.bulk_create([
            EventParticipant(event=event, **participant) for participant in participants
        ])
        EventCharge.objects.bulk_create([
            EventCharge(event=event, **charge) for charge in charges
        ])
        return event

    @transaction.atomic
    def update(self, instance, validated_data):
        participants = validated_data.pop("participants", None)
        charges = validated_data.pop("charges", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if participants is not None:
            instance.participants.all().delete()
            EventParticipant.objects.bulk_create([
                EventParticipant(event=instance, **participant) for participant in participants
            ])
        if charges is not None:
            instance.charges.all().delete()
            EventCharge.objects.bulk_create([
                EventCharge(event=instance, **charge) for charge in charges
            ])
        return instance


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
            "meal_plan",
            "cancellation_deadline_hours",
            "cancellation_fee_percent",
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