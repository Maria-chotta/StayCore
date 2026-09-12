from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import StaffMembership
from apps.hotels.models import Hotel


class PortfolioOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hotel_ids = list(
            StaffMembership.objects.filter(
                user=request.user,
                is_active=True,
            ).values_list("hotel_id", flat=True)
        )

        if not hotel_ids:
            return Response({"properties": []}, status=status.HTTP_200_OK)

        hotels = list(
            Hotel.objects.filter(id__in=hotel_ids)
            .values("id", "name", "status")
            .order_by("name")
        )

        properties = []
        for hotel in hotels:
            membership = StaffMembership.objects.filter(
                user=request.user,
                hotel_id=hotel["id"],
                is_active=True,
            ).first()

            properties.append({
                "hotel_id": hotel["id"],
                "hotel_name": hotel["name"],
                "status": hotel["status"],
                "role": membership.role if membership else None,
                "occupancy": 0,
                "reservations": 0,
                "alerts": 0,
            })

        return Response({"properties": properties}, status=status.HTTP_200_OK)
