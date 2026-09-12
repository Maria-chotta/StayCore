from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from .models import Guest
from .serializers import GuestSerializer
from apps.accounts.models import StaffMembership


class GuestViewSet(viewsets.ModelViewSet):
    serializer_class = GuestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # Find hotels where this user has an active membership.
        hotel_ids = StaffMembership.objects.filter(
            user=user,
            is_active=True,
        ).values_list(
            "hotel_id",
            flat=True,
        )

        queryset = Guest.objects.select_related(
            "hotel"
        ).filter(
            hotel_id__in=hotel_ids
        )

        hotel = self.request.user.resolve_hotel_context(self.request)
        search = self.request.query_params.get("search")
        is_active = self.request.query_params.get("is_active")

        # Optional hotel filter.
        if hotel is not None:
            queryset = queryset.filter(
                hotel_id=hotel
            )

        # Search guests.
        if search:
            queryset = queryset.filter(
                first_name__icontains=search
            ) | queryset.filter(
                last_name__icontains=search
            ) | queryset.filter(
                email__icontains=search
            ) | queryset.filter(
                phone__icontains=search
            ) | queryset.filter(
                identification_number__icontains=search
            )

        # Active/inactive filter.
        if is_active is not None:
            queryset = queryset.filter(
                is_active=is_active.lower() == "true"
            )

        return queryset.order_by(
            "first_name",
            "last_name"
        )