from datetime import date, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Count
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import EventPackage, GroupBooking, RatePlan, Room, RoomType, ScheduledEvent
from .serializers import (
    EventPackageSerializer,
    GroupBookingSerializer,
    RatePlanSerializer,
    RoomSerializer,
    RoomTypeSerializer,
    ScheduledEventSerializer,
)
from apps.accounts.models import StaffMembership
from apps.reservations.models import Reservation


class GroupBookingViewSet(viewsets.ModelViewSet):
    serializer_class = GroupBookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_ids = StaffMembership.objects.filter(
            user=self.request.user,
            is_active=True,
        ).values_list("hotel_id", flat=True)

        queryset = GroupBooking.objects.select_related("hotel").filter(hotel_id__in=hotel_ids)
        hotel = self.request.user.resolve_hotel_context(self.request)
        if hotel is not None:
            queryset = queryset.filter(hotel_id=hotel)

        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)

        return queryset.order_by("-start_date")


class EventPackageViewSet(viewsets.ModelViewSet):
    serializer_class = EventPackageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_ids = StaffMembership.objects.filter(
            user=self.request.user,
            is_active=True,
        ).values_list("hotel_id", flat=True)

        queryset = EventPackage.objects.select_related("hotel").filter(hotel_id__in=hotel_ids)
        hotel = self.request.user.resolve_hotel_context(self.request)
        if hotel is not None:
            queryset = queryset.filter(hotel_id=hotel)

        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in {"1", "true", "yes"})

        return queryset.order_by("name")


class ScheduledEventViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduledEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_ids = StaffMembership.objects.filter(
            user=self.request.user,
            is_active=True,
        ).values_list("hotel_id", flat=True)
        queryset = ScheduledEvent.objects.filter(hotel_id__in=hotel_ids).select_related(
            "hotel",
            "package",
        ).prefetch_related("participants", "charges")
        hotel = self.request.user.resolve_hotel_context(self.request)
        if hotel is not None:
            queryset = queryset.filter(hotel_id=hotel)
        return queryset.order_by("start_at")


class RatePlanViewSet(viewsets.ModelViewSet):
    serializer_class = RatePlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_ids = StaffMembership.objects.filter(
            user=self.request.user,
            is_active=True,
        ).values_list("hotel_id", flat=True)

        queryset = RatePlan.objects.select_related("hotel").filter(hotel_id__in=hotel_ids)
        hotel = self.request.user.resolve_hotel_context(self.request)
        if hotel is not None:
            queryset = queryset.filter(hotel_id=hotel)

        rate_type = self.request.query_params.get("rate_type")
        if rate_type:
            queryset = queryset.filter(rate_type=rate_type)

        return queryset.order_by("-start_date")


class RoomTypeViewSet(viewsets.ModelViewSet):
    serializer_class = RoomTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RoomType.objects.all().order_by("name")


class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_ids = StaffMembership.objects.filter(
            user=self.request.user,
            is_active=True,
        ).values_list(
            "hotel_id",
            flat=True,
        )

        queryset = Room.objects.select_related(
            "hotel",
            "room_type",
        ).filter(
            hotel_id__in=hotel_ids
        )

        hotel = self.request.user.resolve_hotel_context(self.request)
        status = self.request.query_params.get("status")
        room_type = self.request.query_params.get("room_type")

        if hotel is not None:
            queryset = queryset.filter(
                hotel_id=hotel
            )

        if status:
            queryset = queryset.filter(
                status=status
            )

        if room_type:
            queryset = queryset.filter(
                room_type_id=room_type
            )

        return queryset.order_by(
            "room_number"
        )

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        queryset = self.get_queryset()
        status_breakdown = queryset.values("status").annotate(total=Count("id"))
        status_map = {
            "AVAILABLE": 0,
            "OCCUPIED": 0,
            "DIRTY": 0,
            "CLEANING": 0,
            "MAINTENANCE": 0,
            "OUT_OF_ORDER": 0,
        }

        for row in status_breakdown:
            status_map[row["status"]] = row["total"]

        payload = {
            "total_rooms": queryset.count(),
            "available": status_map["AVAILABLE"],
            "occupied": status_map["OCCUPIED"],
            "dirty": status_map["DIRTY"],
            "cleaning": status_map["CLEANING"],
            "maintenance": status_map["MAINTENANCE"],
            "out_of_order": status_map["OUT_OF_ORDER"],
            "active_rooms": queryset.filter(is_active=True).count(),
            "inactive_rooms": queryset.filter(is_active=False).count(),
            "status_breakdown": status_map,
        }
        return Response(payload)

    @action(detail=False, methods=["get"], url_path="availability")
    def availability(self, request):
        raw_start_date = request.query_params.get("start_date")
        raw_days = request.query_params.get("days", "14")
        try:
            start_date = date.fromisoformat(raw_start_date) if raw_start_date else date.today()
            day_count = int(raw_days)
        except (TypeError, ValueError) as exc:
            raise ValidationError({"detail": "Provide a valid start_date (YYYY-MM-DD) and integer days."}) from exc
        if day_count < 1 or day_count > 31:
            raise ValidationError({"days": "The availability view supports between 1 and 31 days."})

        hotel_id = request.user.resolve_hotel_context(request)
        if hotel_id is None:
            hotel_ids = list(StaffMembership.objects.filter(
                user=request.user, is_active=True
            ).values_list("hotel_id", flat=True))
            if len(hotel_ids) != 1:
                raise ValidationError({"hotel": "Select a hotel to view availability."})
            hotel_id = hotel_ids[0]

        hotel_timezone = ZoneInfo(request.user.staff_memberships.select_related("hotel").get(
            hotel_id=hotel_id, is_active=True
        ).hotel.timezone)
        if not raw_start_date:
            start_date = timezone.localtime(timezone.now(), hotel_timezone).date()

        dates = [start_date + timedelta(days=offset) for offset in range(day_count)]
        end_date = start_date + timedelta(days=day_count)
        room_types = RoomType.objects.filter(
            rooms__hotel_id=hotel_id,
            rooms__is_active=True,
        ).distinct().order_by("name")
        rooms = list(Room.objects.filter(
            hotel_id=hotel_id,
            is_active=True,
            room_type__in=room_types,
        ).select_related("room_type"))
        reservations = list(Reservation.objects.filter(
            hotel_id=hotel_id,
            check_in_date__lt=end_date,
            check_out_date__gt=start_date,
        ).exclude(
            status__in=[Reservation.Status.CANCELLED, Reservation.Status.NO_SHOW]
        ).select_related("room"))

        matrix = []
        for room_type in room_types:
            type_rooms = [room for room in rooms if room.room_type_id == room_type.id]
            type_reservations = [reservation for reservation in reservations if reservation.room.room_type_id == room_type.id]
            day_rows = []
            for business_date in dates:
                reserved = {}
                reserved_room_ids = set()
                for reservation in type_reservations:
                    if reservation.check_in_date <= business_date < reservation.check_out_date:
                        reserved.setdefault(reservation.status, set()).add(reservation.room_id)
                        reserved_room_ids.add(reservation.room_id)
                unavailable_room_ids = {
                    room.id for room in type_rooms
                    if room.status != Room.Status.AVAILABLE
                }
                unavailable_room_ids -= reserved_room_ids
                day_rows.append({
                    "date": business_date,
                    "reserved": len(reserved_room_ids),
                    "reservation_statuses": {
                        status: len(room_ids) for status, room_ids in reserved.items()
                    },
                    "unavailable": len(unavailable_room_ids),
                    "available": max(0, len(type_rooms) - len(reserved_room_ids | unavailable_room_ids)),
                })
            matrix.append({
                "room_type_id": room_type.id,
                "room_type_name": room_type.name,
                "total_rooms": len(type_rooms),
                "days": day_rows,
            })
        return Response({
            "start_date": start_date,
            "days": day_count,
            "dates": dates,
            "room_types": matrix,
        })