from django.db import transaction
from django.utils import timezone

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Reservation
from .serializers import ReservationSerializer
from apps.rooms.models import Room
from apps.accounts.models import StaffMembership


class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer
    permission_classes = [IsAuthenticated]

    # ---------------------------------------------------------------
    # Lifecycle rules (single source of truth, used by PATCH and the
    # dedicated actions below). Room state is only ever changed inside
    # the same transaction as a successful reservation transition.
    # ---------------------------------------------------------------

    def _validate_check_in(self, reservation):
        if reservation.status != Reservation.Status.CONFIRMED:
            raise ValidationError({
                "status": "Only confirmed reservations can be checked in."
            })

        room = reservation.room

        if room is None:
            raise ValidationError({
                "room": "This reservation has no room assigned."
            })

        if room.status != Room.Status.AVAILABLE:
            raise ValidationError({
                "room": (
                    f"Room {room.room_number} is not available for "
                    f"check-in (current status: {room.status})."
                )
            })

        today = timezone.localdate()

        if reservation.check_out_date < today:
            raise ValidationError({
                "check_out_date": (
                    "This reservation's stay has already ended; "
                    "check-in is not possible."
                )
            })

    @transaction.atomic
    def _do_check_in(self, reservation, user):
        self._validate_check_in(reservation)

        reservation.status = Reservation.Status.CHECKED_IN
        reservation.actual_check_in = timezone.now()
        reservation.checked_in_by = user
        reservation.save(
            update_fields=[
                "status",
                "actual_check_in",
                "checked_in_by",
                "updated_at",
            ]
        )

        room = reservation.room
        room.status = Room.Status.OCCUPIED
        room.save(update_fields=["status", "updated_at"])

        return reservation

    @transaction.atomic
    def _do_check_out(self, reservation, user):
        if reservation.status != Reservation.Status.CHECKED_IN:
            raise ValidationError({
                "status": "Only checked-in reservations can be checked out."
            })

        reservation.status = Reservation.Status.CHECKED_OUT
        reservation.actual_check_out = timezone.now()
        reservation.checked_out_by = user
        reservation.save(
            update_fields=[
                "status",
                "actual_check_out",
                "checked_out_by",
                "updated_at",
            ]
        )

        room = reservation.room
        if room:
            room.status = Room.Status.DIRTY
            room.save(update_fields=["status", "updated_at"])

        return reservation

    @transaction.atomic
    def _do_confirm(self, reservation):
        if reservation.status != Reservation.Status.PENDING:
            raise ValidationError({
                "status": "Only pending reservations can be confirmed."
            })

        reservation.status = Reservation.Status.CONFIRMED
        reservation.save(update_fields=["status", "updated_at"])

        return reservation

    @transaction.atomic
    def _do_cancel(self, reservation):
        if reservation.status not in (
            Reservation.Status.PENDING,
            Reservation.Status.CONFIRMED,
        ):
            raise ValidationError({
                "status": (
                    "Only pending or confirmed reservations "
                    "can be cancelled."
                )
            })

        reservation.status = Reservation.Status.CANCELLED
        reservation.save(update_fields=["status", "updated_at"])

        return reservation

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
            "folio",
        ).filter(
            hotel_id__in=hotel_ids
        )

        params = self.request.query_params

        status = params.get("status")
        guest = params.get("guest")
        room = params.get("room")
        hotel = params.get("hotel")
        q = params.get("q")
        check_in_after = params.get("check_in_after")
        check_in_before = params.get("check_in_before")
        date = params.get("date")

        if status:
            queryset = queryset.filter(status=status)

        if guest:
            queryset = queryset.filter(guest_id=guest)

        if room:
            queryset = queryset.filter(room_id=room)

        if hotel:
            queryset = queryset.filter(hotel_id=hotel)

        if check_in_after:
            queryset = queryset.filter(check_in_date__gte=check_in_after)

        if check_in_before:
            queryset = queryset.filter(check_in_date__lte=check_in_before)

        # "Staying on this date" filter (arrived, not yet departed).
        if date:
            queryset = queryset.filter(
                check_in_date__lte=date,
                check_out_date__gt=date,
            )

        if q:
            from django.db.models import Q

            queryset = queryset.filter(
                Q(guest__first_name__icontains=q)
                | Q(guest__last_name__icontains=q)
                | Q(guest__email__icontains=q)
                | Q(room__room_number__icontains=q)
            )

        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        new_status = serializer.validated_data.get("status", old_status)

        reservation = serializer.instance

        # Route status-only transitions through the shared, transactional
        # lifecycle helpers so PATCH and the dedicated actions enforce
        # exactly the same business rules.
        if new_status != old_status:
            if new_status == Reservation.Status.CONFIRMED:
                serializer.instance = self._do_confirm(reservation)
                return

            if new_status == Reservation.Status.CHECKED_IN:
                serializer.instance = self._do_check_in(
                    reservation, self.request.user
                )
                return

            if new_status == Reservation.Status.CHECKED_OUT:
                serializer.instance = self._do_check_out(
                    reservation, self.request.user
                )
                return

            if new_status == Reservation.Status.CANCELLED:
                serializer.instance = self._do_cancel(reservation)
                return

            raise ValidationError({
                "status": (
                    f"Cannot change status from {old_status} "
                    f"to {new_status}."
                )
            })

        serializer.save()

    # ---------------------------------------------------------------
    # Dedicated lifecycle actions.
    # ---------------------------------------------------------------

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        reservation = self.get_object()
        self._do_confirm(reservation)
        return Response(self.get_serializer(reservation).data)

    @action(detail=True, methods=["post"])
    def check_in(self, request, pk=None):
        reservation = self.get_object()
        self._do_check_in(reservation, request.user)
        return Response(self.get_serializer(reservation).data)

    @action(detail=True, methods=["post"])
    def check_out(self, request, pk=None):
        reservation = self.get_object()
        self._do_check_out(reservation, request.user)
        return Response(self.get_serializer(reservation).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        self._do_cancel(reservation)
        return Response(self.get_serializer(reservation).data)

