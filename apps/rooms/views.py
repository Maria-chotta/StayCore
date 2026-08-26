from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Room, RoomType
from .serializers import RoomSerializer, RoomTypeSerializer
from apps.accounts.models import StaffMembership


class RoomTypeViewSet(viewsets.ModelViewSet):
    serializer_class = RoomTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_ids = StaffMembership.objects.filter(
            user=self.request.user,
            is_active=True,
        ).values_list(
            "hotel_id",
            flat=True,
        )

        return RoomType.objects.filter(
            rooms__hotel_id__in=hotel_ids
        ).distinct().order_by(
            "name"
        )


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

        hotel = self.request.query_params.get("hotel")
        status = self.request.query_params.get("status")
        room_type = self.request.query_params.get("room_type")

        if hotel:
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