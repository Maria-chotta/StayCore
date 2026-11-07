from datetime import timedelta

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import StaffMembership, User
from apps.guests.models import Guest
from apps.hotels.models import Hotel
from apps.reservations.models import Reservation
from apps.rooms.models import Room, RoomType

from .models import HouseAccount, LedgerAccount
from .services import hotel_local_date


class AccountingWorkflowTests(TestCase):
    def setUp(self):
        self.hotel = Hotel.objects.create(
            name="Ledger Lodge",
            address="10 Finance Road",
            city="Dar es Salaam",
            timezone="Africa/Dar_es_Salaam",
        )
        self.user = User.objects.create_user(email="accountant@example.com", password="test-password")
        StaffMembership.objects.create(user=self.user, hotel=self.hotel, role=StaffMembership.Role.ACCOUNTANT)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_HOTEL_ID=str(self.hotel.id))
        self.cash = LedgerAccount.objects.create(
            hotel=self.hotel,
            code="1000",
            name="Cash",
            account_type=LedgerAccount.AccountType.ASSET,
        )
        self.revenue = LedgerAccount.objects.create(
            hotel=self.hotel,
            code="4000",
            name="Revenue",
            account_type=LedgerAccount.AccountType.REVENUE,
        )

    def test_journal_must_balance_then_post_and_roll_into_statements(self):
        payload = {
            "hotel": self.hotel.id,
            "entry_date": "2026-10-20",
            "reference": "RCPT-1",
            "description": "Room revenue",
            "lines": [
                {"account": self.cash.id, "description": "Cash received", "debit": "250.00", "credit": "0"},
                {"account": self.revenue.id, "description": "Room charge", "debit": "0", "credit": "250.00"},
            ],
        }
        response = self.client.post("/api/journal-entries/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        entry_id = response.data["id"]

        post_response = self.client.post(f"/api/journal-entries/{entry_id}/post/", {}, format="json")
        self.assertEqual(post_response.status_code, 200, post_response.data)
        report = self.client.get("/api/accounting-reports/")
        self.assertEqual(report.status_code, 200, report.data)
        self.assertEqual(float(report.data["income_statement"]["revenue"]), 250.0)
        self.assertEqual(float(report.data["balance_sheet"]["assets"]), 250.0)
        self.assertEqual(float(report.data["balance_sheet"]["equity"]), 250.0)

    def test_unbalanced_journal_is_rejected(self):
        response = self.client.post(
            "/api/journal-entries/",
            {
                "hotel": self.hotel.id,
                "entry_date": "2026-10-20",
                "description": "Unbalanced",
                "lines": [
                    {"account": self.cash.id, "debit": "100.00", "credit": "0"},
                    {"account": self.revenue.id, "debit": "0", "credit": "90.00"},
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_closing_day_locks_new_house_account_activities(self):
        business_date = hotel_local_date(self.hotel)
        close_response = self.client.post(
            "/api/business-day-closes/close/",
            {
                "business_date": business_date.isoformat(),
                "reservations_reviewed": True,
                "payments_reconciled": True,
                "cash_reconciled": True,
                "revenue_reviewed": True,
                "notes": "All reconciliations reviewed.",
            },
            format="json",
        )
        self.assertEqual(close_response.status_code, 201, close_response.data)

        account = HouseAccount.objects.create(hotel=self.hotel, name="Corporate account")
        activity_response = self.client.post(
            "/api/house-account-activities/",
            {
                "account": account.id,
                "activity_type": "CHARGE",
                "amount": "10.00",
                "description": "Closed date adjustment",
                "transaction_date": business_date.isoformat(),
            },
            format="json",
        )

        self.assertEqual(activity_response.status_code, 400)

    def test_future_business_day_cannot_be_closed(self):
        future_date = hotel_local_date(self.hotel) + timedelta(days=1)
        response = self.client.post(
            "/api/business-day-closes/close/",
            {
                "business_date": future_date.isoformat(),
                "reservations_reviewed": True,
                "payments_reconciled": True,
                "cash_reconciled": True,
                "revenue_reviewed": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_closed_business_day_blocks_reservation_status_changes(self):
        business_date = hotel_local_date(self.hotel)
        guest = Guest.objects.create(hotel=self.hotel, first_name="Casey", last_name="Guest")
        room_type = RoomType.objects.create(name="Standard", base_price=100)
        room = Room.objects.create(hotel=self.hotel, room_type=room_type, room_number="201")
        reservation = Reservation.objects.create(
            hotel=self.hotel,
            guest=guest,
            room=room,
            check_in_date=business_date + timedelta(days=2),
            check_out_date=business_date + timedelta(days=3),
        )
        close_response = self.client.post(
            "/api/business-day-closes/close/",
            {
                "business_date": business_date.isoformat(),
                "reservations_reviewed": True,
                "payments_reconciled": True,
                "cash_reconciled": True,
                "revenue_reviewed": True,
            },
            format="json",
        )
        self.assertEqual(close_response.status_code, 201, close_response.data)

        response = self.client.patch(
            f"/api/reservations/{reservation.id}/",
            {"status": Reservation.Status.CONFIRMED},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
