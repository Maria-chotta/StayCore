from rest_framework import serializers

from .models import Reservation
from apps.guests.models import Guest
from apps.rooms.models import Room, RoomType
from apps.billing.models import Folio
from apps.accounts.models import StaffMembership


class ReservationSerializer(serializers.ModelSerializer):
    number_of_nights = serializers.ReadOnlyField()

    # Billing connection (Phase 6): expose the reservation's folio
    # summary without duplicating billing logic - totals and balance
    # come from the existing Folio model properties.
    class FolioSummarySerializer(serializers.ModelSerializer):
        class Meta:
            model = Folio
            fields = [
                "id",
                "status",
                "total_charges",
                "total_paid",
                "balance",
            ]
            read_only_fields = fields

    folio = FolioSummarySerializer(read_only=True)

    # Read-only nested/display serializers for dashboard/enrichment
    class GuestDisplaySerializer(serializers.ModelSerializer):
        class Meta:
            model = Guest
            fields = ["id", "first_name", "last_name", "phone", "email"]
            read_only_fields = fields

    class RoomTypeDisplaySerializer(serializers.ModelSerializer):
        class Meta:
            model = RoomType
            fields = ["id", "name"]
            read_only_fields = fields

    class RoomDisplaySerializer(serializers.ModelSerializer):
        room_type = serializers.SerializerMethodField()

        class Meta:
            model = Room
            fields = ["id", "room_number", "room_type", "status"]
            read_only_fields = fields

        def get_room_type(self, room):
            rt = getattr(room, "room_type", None)
            if not rt:
                return None
            return {"id": rt.id, "name": rt.name}

    guest_details = GuestDisplaySerializer(source="guest", read_only=True)
    room_details = RoomDisplaySerializer(source="room", read_only=True)

    class Meta:
        model = Reservation

        fields = [
            "id",
            "hotel",
            "guest",
            "guest_details",
            "room",
            "room_details",
            "check_in_date",
            "check_out_date",
            "actual_check_in",
            "actual_check_out",
            "checked_in_by",
            "checked_out_by",
            "adults",
            "children",
            "status",
            "special_requests",
            "notes",
            "folio",
            "number_of_nights",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "actual_check_in",
            "actual_check_out",
            "checked_in_by",
            "checked_out_by",
            "number_of_nights",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        hotel = attrs.get(
            "hotel",
            self.instance.hotel if self.instance else None
        )

        guest = attrs.get(
            "guest",
            self.instance.guest if self.instance else None
        )

        room = attrs.get(
            "room",
            self.instance.room if self.instance else None
        )

        check_in_date = attrs.get(
            "check_in_date",
            self.instance.check_in_date if self.instance else None
        )

        check_out_date = attrs.get(
            "check_out_date",
            self.instance.check_out_date if self.instance else None
        )

        # Make sure checkout is after check-in.
        if check_in_date and check_out_date:
            if check_out_date <= check_in_date:
                raise serializers.ValidationError({
                    "check_out_date": (
                        "Check-out date must be after check-in date."
                    )
                })

        # Make sure the room belongs to the hotel.
        if room and hotel:
            if room.hotel_id != hotel.id:
                raise serializers.ValidationError({
                    "room": (
                        "This room does not belong to the selected hotel."
                    )
                })

        # Make sure the guest belongs to the hotel.
        if guest and hotel:
            if guest.hotel_id != hotel.id:
                raise serializers.ValidationError({
                    "guest": (
                        "This guest does not belong to the selected hotel."
                    )
                })

        # Check room availability for overlapping reservations.
        if (
            room
            and check_in_date
            and check_out_date
        ):
            overlapping = Reservation.objects.filter(
                room=room,
                check_in_date__lt=check_out_date,
                check_out_date__gt=check_in_date,
            ).exclude(
                pk=self.instance.pk if self.instance else None
            ).exclude(
                status__in=[
                    Reservation.Status.CANCELLED,
                    Reservation.Status.NO_SHOW,
                ]
            )

            if overlapping.exists():
                raise serializers.ValidationError({
                    "room": (
                        f"Room {room.room_number} is not available "
                        "for the selected dates."
                    )
                })

        return attrs
