import csv
import io
from datetime import date

from django.http import StreamingHttpResponse
from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import StaffMembership
from apps.accounting.models import HouseAccount, LedgerAccount
from apps.guests.models import Guest
from apps.guests.serializers import GuestSerializer
from apps.reservations.models import Reservation
from apps.rooms.models import RatePlan, Room
from apps.accounting.serializers import HouseAccountSerializer

from .models import AuditLog


FINANCE_ROLES = [
    StaffMembership.Role.OWNER,
    StaffMembership.Role.MANAGER,
    StaffMembership.Role.ACCOUNTANT,
]


class Echo:
    def write(self, value):
        return value


def csv_safe(value):
    value = "" if value is None else str(value)
    if value.startswith(("=", "+", "-", "@", "\t", "\r")):
        return f"'{value}"
    return value


class HotelUtilityView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_hotel(self, request):
        memberships = StaffMembership.objects.filter(
            user=request.user, role__in=FINANCE_ROLES, is_active=True
        ).select_related("hotel")
        hotel_id = request.user.resolve_hotel_context(request)
        if hotel_id is not None:
            membership = memberships.filter(hotel_id=hotel_id).first()
            if not membership:
                raise ValidationError({"hotel": "You do not have utilities access to this hotel."})
            return membership.hotel
        if memberships.count() == 1:
            return memberships.get().hotel
        raise ValidationError({"hotel": "Select a hotel before using utilities."})

    def get(self, request):
        hotel = self.get_hotel(request)
        resource = request.query_params.get("resource")
        if resource == "audit-logs":
            logs = AuditLog.objects.filter(hotel=hotel).select_related("actor")[:500]
            rows = [{
                "id": log.id,
                "action": log.action,
                "resource": log.resource,
                "endpoint": log.endpoint,
                "response_status": log.response_status,
                "actor": log.actor.get_full_name() or log.actor.email if log.actor else "Deleted user",
                "created_at": log.created_at,
            } for log in logs]
            return Response({"results": rows, "limit": 500})
        if resource != "export":
            raise ValidationError({"resource": "Select audit-logs or export."})

        kind = request.query_params.get("type")
        datasets = {
            "guests": (
                Guest.objects.filter(hotel=hotel).order_by("id"),
                ["id", "first_name", "last_name", "email", "phone", "gender", "nationality", "city", "country", "is_active"],
                lambda item: [item.id, item.first_name, item.last_name, item.email, item.phone, item.gender, item.nationality, item.city, item.country, item.is_active],
            ),
            "rooms": (
                Room.objects.filter(hotel=hotel).select_related("room_type").order_by("room_number"),
                ["id", "room_number", "room_type", "status", "floor", "is_active"],
                lambda item: [item.id, item.room_number, item.room_type.name, item.status, item.floor, item.is_active],
            ),
            "reservations": (
                Reservation.objects.filter(hotel=hotel).select_related("guest", "room").order_by("id"),
                ["id", "guest_first_name", "guest_last_name", "room_number", "check_in_date", "check_out_date", "status", "adults", "children"],
                lambda item: [item.id, item.guest.first_name, item.guest.last_name, item.room.room_number, item.check_in_date, item.check_out_date, item.status, item.adults, item.children],
            ),
            "house-accounts": (
                HouseAccount.objects.filter(hotel=hotel).order_by("name"),
                ["id", "name", "contact_name", "email", "phone", "credit_limit", "balance", "status"],
                lambda item: [item.id, item.name, item.contact_name, item.email, item.phone, item.credit_limit, item.balance, item.status],
            ),
            "ledger-accounts": (
                LedgerAccount.objects.filter(hotel=hotel).order_by("code"),
                ["id", "code", "name", "account_type", "is_active"],
                lambda item: [item.id, item.code, item.name, item.account_type, item.is_active],
            ),
            "rate-plans": (
                RatePlan.objects.filter(hotel=hotel).order_by("start_date"),
                ["id", "name", "rate_type", "price", "start_date", "end_date", "is_active"],
                lambda item: [item.id, item.name, item.rate_type, item.price, item.start_date, item.end_date, item.is_active],
            ),
        }
        if kind not in datasets:
            raise ValidationError({"type": f"Unsupported export type: {kind}"})
        queryset, columns, values = datasets[kind]

        def rows():
            writer = csv.writer(Echo())
            yield writer.writerow(columns)
            for record in queryset.iterator(chunk_size=500):
                yield writer.writerow([csv_safe(value) for value in values(record)])

        AuditLog.objects.create(
            hotel=hotel,
            actor=request.user,
            action=AuditLog.Action.EXPORT,
            resource=f"export:{kind}",
            endpoint=request.path[:255],
            response_status=status.HTTP_200_OK,
        )
        response = StreamingHttpResponse(rows(), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="{kind}-{date.today().isoformat()}.csv"'
        return response

    def post(self, request):
        hotel = self.get_hotel(request)
        kind = request.data.get("type")
        uploaded_file = request.FILES.get("file")
        if kind not in {"guests", "house-accounts"}:
            raise ValidationError({"type": "CSV import supports guests and house-accounts."})
        if uploaded_file is None:
            raise ValidationError({"file": "Choose a CSV file to import."})
        if uploaded_file.size > 2 * 1024 * 1024:
            raise ValidationError({"file": "CSV files must be 2 MB or smaller."})
        try:
            content = uploaded_file.read().decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ValidationError({"file": "The CSV file must use UTF-8 encoding."}) from exc
        reader = csv.DictReader(io.StringIO(content))
        if not reader.fieldnames:
            raise ValidationError({"file": "The CSV file needs a header row."})
        if len(reader.fieldnames) > 40 or any(len(name or "") > 100 for name in reader.fieldnames):
            raise ValidationError({"file": "The CSV header has too many or oversized columns."})
        allowed_columns = {
            "guests": {
                "first_name", "last_name", "email", "phone", "gender", "date_of_birth",
                "nationality", "address", "city", "country", "identification_type",
                "identification_number", "notes", "is_active",
            },
            "house-accounts": {
                "name", "contact_name", "email", "phone", "credit_limit", "status", "notes",
            },
        }[kind]
        headers = [name.strip() for name in reader.fieldnames]
        if len(headers) != len(set(headers)) or any(not name for name in headers):
            raise ValidationError({"file": "CSV column names must be non-empty and unique."})
        missing_columns = (
            {"first_name", "last_name"} if kind == "guests" else {"name"}
        ) - set(headers)
        unknown_columns = set(headers) - allowed_columns
        if missing_columns or unknown_columns:
            raise ValidationError({
                "file": {
                    "missing_columns": sorted(missing_columns),
                    "unknown_columns": sorted(unknown_columns),
                }
            })
        reader.fieldnames = headers
        rows = list(reader)
        if not rows or len(rows) > 1000:
            raise ValidationError({"file": "CSV imports must contain between 1 and 1000 data rows."})
        if any(None in row for row in rows):
            raise ValidationError({"file": "Every CSV data row must match the number of columns in the header."})

        serializer_class = GuestSerializer if kind == "guests" else HouseAccountSerializer
        validated_serializers = []
        row_errors = []
        seen_unique_values = set()
        for row_number, row in enumerate(rows, start=2):
            if kind == "guests" and row.get("identification_number"):
                unique_value = ("identification_number", row["identification_number"].strip().casefold())
            elif kind == "house-accounts" and row.get("name"):
                unique_value = ("name", row["name"].strip().casefold())
            else:
                unique_value = None
            if unique_value and unique_value in seen_unique_values:
                row_errors.append({"row": row_number, "errors": {"duplicate": "This unique value is repeated in the uploaded file."}})
                continue
            if unique_value:
                seen_unique_values.add(unique_value)
            row["hotel"] = str(hotel.id)
            serializer = serializer_class(data=row, context={"request": request})
            if serializer.is_valid():
                validated_serializers.append(serializer)
            else:
                row_errors.append({"row": row_number, "errors": serializer.errors})
        if row_errors:
            return Response({"detail": "No rows were imported. Fix the listed errors and upload the file again.", "errors": row_errors}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for serializer in validated_serializers:
                serializer.save()
        AuditLog.objects.create(
            hotel=hotel,
            actor=request.user,
            action=AuditLog.Action.IMPORT,
            resource=f"import:{kind}:{len(rows)}",
            endpoint=request.path[:255],
            response_status=status.HTTP_201_CREATED,
        )
        return Response({"imported": len(rows), "type": kind}, status=status.HTTP_201_CREATED)
