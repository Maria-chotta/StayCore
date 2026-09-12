from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Hotel
from .serializers import HotelSerializer
from apps.accounts.models import StaffMembership


class HotelViewSet(viewsets.ModelViewSet):
    serializer_class = HotelSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_ids = StaffMembership.objects.filter(
            user=self.request.user,
            is_active=True,
        ).values_list("hotel_id", flat=True)

        return Hotel.objects.filter(
            id__in=hotel_ids
        ).order_by("name")

    def perform_create(self, serializer):
        hotel = serializer.save()

        StaffMembership.objects.get_or_create(
            user=self.request.user,
            hotel=hotel,
            defaults={
                "role": StaffMembership.Role.OWNER,
                "is_active": True,
            },
        )
