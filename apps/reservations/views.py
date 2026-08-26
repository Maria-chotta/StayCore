from django.utils import timezone

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Reservation
from .serializers import ReservationSerializer
from apps.rooms.models import Room
from apps.accounts.models import StaffMembership


class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_ids = StaffMembership.objects.filter(
            user=self.request.user,
            is_active=True,
        ).values_list(
            "hotel_id",
            flat=True,
        )

        queryset = Reservation.objects.select_related(
            "hotel",
            "guest",
            "room",
            "room__room_type",
            "checked_in_by",
            "checked_out_by",
        ).filter(
            hotel_id__in=hotel_ids
        )

        status = self.request.query_params.get("status")
        guest = self.request.query_params.get("guest")
        room = self.request.query_params.get("room")
        hotel = self.request.query_params.get("hotel")

        if status:
            queryset = queryset.filter(
                status=status
            )

        if guest:
            queryset = queryset.filter(
                guest_id=guest
            )

        if room:
            queryset = queryset.filter(
                room_id=room
            )

        if hotel:
            queryset = queryset.filter(
                hotel_id=hotel
            )

        return queryset.order_by(
            "-created_at"
        )

    def perform_create(self, serializer):
        reservation = serializer.save()

        return reservation

    def perform_update(self, serializer):
        old_status = serializer.instance.status

        reservation = serializer.save()

        room = reservation.room

        if not room:
            return

        # Guest checks in.
        if (
            old_status != Reservation.Status.CHECKED_IN
            and reservation.status == Reservation.Status.CHECKED_IN
        ):
            # Only confirmed reservations can be checked in.
            if old_status != Reservation.Status.CONFIRMED:
                from rest_framework.exceptions import ValidationError

                raise ValidationError({
                    "status": (
                        "Only confirmed reservations can be checked in."
                    )
                })

            # Room must physically be available.
            if room.status != Room.Status.AVAILABLE:
                from rest_framework.exceptions import ValidationError

                raise ValidationError({
                    "room": (
                        "This room is not currently available "
                        "for check-in."
                    )
                })

            reservation.actual_check_in = timezone.now()
            reservation.checked_in_by = self.request.user

            reservation.save(
                update_fields=[
                    "actual_check_in",
                    "checked_in_by",
                    "updated_at",
                ]
            )

            room.status = Room.Status.OCCUPIED

            room.save(
                update_fields=[
                    "status",
                    "updated_at",
                ]
            )

        # Guest checks out.
        elif (
            old_status != Reservation.Status.CHECKED_OUT
            and reservation.status == Reservation.Status.CHECKED_OUT
        ):
            reservation.actual_check_out = timezone.now()
            reservation.checked_out_by = self.request.user

            reservation.save(
                update_fields=[
                    "actual_check_out",
                    "checked_out_by",
                    "updated_at",
                ]
            )

            room.status = Room.Status.DIRTY

            room.save(
                update_fields=[
                    "status",
                    "updated_at",
                ]
            )