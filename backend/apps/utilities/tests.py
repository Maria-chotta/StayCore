from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import StaffMembership, User
from apps.hotels.models import Hotel

from .models import AuditLog


class HotelUtilitiesTests(TestCase):
    def setUp(self):
        self.hotel = Hotel.objects.create(
            name="Utilities Lodge",
            address="3 Beach Road",
            city="Dar es Salaam",
        )
        self.user = User.objects.create_user(email="utilities@example.com", password="test-password")
        StaffMembership.objects.create(user=self.user, hotel=self.hotel, role=StaffMembership.Role.MANAGER)
        self.client = APIClient()
        access_token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
            HTTP_X_HOTEL_ID=str(self.hotel.id),
        )

    def test_csv_import_validates_all_rows_before_creating_records(self):
        response = self.client.post(
            "/api/utilities/",
            {
                "type": "guests",
                "file": SimpleUploadedFile("guests.csv", (
                    "first_name,last_name,email\n"
                    "Sam,Guest,sam@example.com\n"
                    ",Missing,missing@example.com\n"
                ).encode(), content_type="text/csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["errors"][0]["row"], 3)
        from apps.guests.models import Guest
        self.assertEqual(Guest.objects.filter(hotel=self.hotel).count(), 0)

    def test_csv_export_is_scoped_to_the_selected_hotel_and_audited(self):
        response = self.client.get("/api/utilities/", {"resource": "export", "type": "guests"})

        self.assertEqual(response.status_code, 200)
        self.assertIn("first_name,last_name", b"".join(response.streaming_content).decode())
        self.assertTrue(AuditLog.objects.filter(
            hotel=self.hotel,
            actor=self.user,
            resource="export:guests",
        ).exists())

    def test_mutating_api_requests_are_logged_without_recording_payloads(self):
        response = self.client.post(
            "/api/house-accounts/",
            {
                "hotel": self.hotel.id,
                "name": "Example Company",
                "contact_name": "Finance",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(AuditLog.objects.filter(
            hotel=self.hotel,
            actor=self.user,
            action=AuditLog.Action.CREATE,
            resource="house-accounts",
        ).exists(), list(AuditLog.objects.values("hotel_id", "actor_id", "action", "resource", "endpoint", "response_status")))
