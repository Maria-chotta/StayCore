from datetime import date

from django.db.models import Count, F, Q, Sum, Value, DecimalField
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import StaffMembership
from apps.billing.models import Folio
from apps.housekeeping.models import HousekeepingTask
from apps.maintenance.models import MaintenanceRequest
from apps.reservations.models import Reservation
from apps.reservations.serializers import ReservationSerializer
from apps.rooms.models import Room


class DashboardSummaryView(APIView):
    """Aggregated KPI data for the main dashboard.

    Scoped to the hotels the authenticated user is an active
    member of. Read-only — no business rules are touched here.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()

        hotel_ids = list(
            StaffMembership.objects.filter(
                user=request.user,
                is_active=True,
            ).values_list("hotel_id", flat=True)
        )

        if not hotel_ids:
            return Response(
                {"detail": "No hotels associated with this user."},
                status=status.HTTP_200_OK,
            )

        # ---- Rooms -------------------------------------------------
        room_counts = dict(
            Room.objects.filter(hotel_id__in=hotel_ids)
            .values_list("status")
            .annotate(n=Count("id"))
        )
        total_rooms = sum(room_counts.values())

        # ---- Housekeeping ------------------------------------------
        housekeeping_counts = dict(
            HousekeepingTask.objects.filter(hotel_id__in=hotel_ids)
            .values_list("status")
            .annotate(n=Count("id"))
        )

        # ---- Maintenance -------------------------------------------
        maintenance_counts = dict(
            MaintenanceRequest.objects.filter(hotel_id__in=hotel_ids)
            .values_list("status")
            .annotate(n=Count("id"))
        )
        high_priority_maintenance = MaintenanceRequest.objects.filter(
            hotel_id__in=hotel_ids
        ).filter(
            Q(priority="URGENT") | Q(priority="HIGH")
        ).exclude(
            status__in=["RESOLVED", "CANCELLED"]
        ).count()

        # ---- Reservations ------------------------------------------
        reservation_counts = dict(
            Reservation.objects.filter(hotel_id__in=hotel_ids)
            .values_list("status")
            .annotate(n=Count("id"))
        )
        today_arrivals = (
            Reservation.objects.filter(
                hotel_id__in=hotel_ids,
                check_in_date=today,
            )
            .exclude(status__in=["CANCELLED", "NO_SHOW"])
            .count()
        )
        today_departures = (
            Reservation.objects.filter(
                hotel_id__in=hotel_ids,
                check_out_date=today,
                status__in=["CONFIRMED", "CHECKED_IN"],
            ).count()
        )

        # ---- Outstanding balance -----------------------------------
        charges = Coalesce(
            Sum(
                F("line_items__quantity") * F("line_items__unit_price"),
                output_field=DecimalField(),
            ),
            Value(0),
            output_field=DecimalField(),
        )
        payments = Coalesce(
            Sum(
                "payments__amount",
                filter=Q(payments__status="COMPLETED"),
                output_field=DecimalField(),
            ),
            Value(0),
            output_field=DecimalField(),
        )
        outstanding = (
            Folio.objects.filter(hotel_id__in=hotel_ids)
            .aggregate(total=charges - payments)["total"]
        )

        # ---- Today's arrivals / departures / recent lists -----------
        arrivals_qs = (
            Reservation.objects.filter(
                hotel_id__in=hotel_ids,
                check_in_date=today,
            )
            .exclude(status__in=["CANCELLED", "NO_SHOW"])
            .select_related("guest", "room", "room_type")
            .order_by("check_in_date", "id")
        )
        departures_qs = (
            Reservation.objects.filter(
                hotel_id__in=hotel_ids,
                check_out_date=today,
            )
            .exclude(status__in=["CANCELLED", "NO_SHOW"])
            .select_related("guest", "room", "room_type")
            .order_by("check_out_date", "id")
        )
        recent_qs = (
            Reservation.objects.filter(hotel_id__in=hotel_ids)
            .select_related("guest", "room", "room_type")
            .order_by("-created_at", "-id")[:10]
        )

        serializer = ReservationSerializer

        return Response(
            {
                "today": today.isoformat(),
                "rooms": {
                    "total": total_rooms,
                    "available": room_counts.get("AVAILABLE", 0),
                    "occupied": room_counts.get("OCCUPIED", 0),
                    "dirty": room_counts.get("DIRTY", 0),
                    "cleaning": room_counts.get("CLEANING", 0),
                    "maintenance": room_counts.get("MAINTENANCE", 0),
                    "out_of_order": room_counts.get("OUT_OF_ORDER", 0),
                },
                "housekeeping": {
                    "counts": housekeeping_counts,
                },
                "maintenance": {
                    "counts": maintenance_counts,
                    "high_priority_open": high_priority_maintenance,
                },
                "reservations": {
                    "counts": reservation_counts,
                    "today_arrivals": today_arrivals,
                    "today_departures": today_departures,
                },
                "arrivals": serializer(arrivals_qs, many=True).data,
                "departures": serializer(departures_qs, many=True).data,
                "recent_reservations": serializer(recent_qs, many=True).data,
                "billing": {
                    "outstanding_balance": str(outstanding or 0),
                },
            }
        )
