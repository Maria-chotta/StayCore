from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import EventPackage, GroupBooking, RatePlan, Room, RoomType
from .serializers import (
    EventPackageSerializer,
    GroupBookingSerializer,
    RatePlanSerializer,
    RoomSerializer,
    RoomTypeSerializer,
)
from apps.accounts.models import StaffMembership


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