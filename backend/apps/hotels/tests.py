from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, StaffMembership
from apps.hotels.models import Hotel
from apps.rooms.models import Room, RoomType


class HotelAccessAndOwnershipTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="manager@example.com",
            password="pass12345",
            first_name="Manager",
            last_name="Example",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.hotel_a = Hotel.objects.create(
            name="Hotel A",
            address="A Street",
            city="Arusha",
        )
        self.hotel_b = Hotel.objects.create(
            name="Hotel B",
            address="B Street",
            city="Dodoma",
        )

        StaffMembership.objects.create(
            user=self.user,
            hotel=self.hotel_a,
            role=StaffMembership.Role.OWNER,
            is_active=True,
        )
        StaffMembership.objects.create(
            user=self.user,
            hotel=self.hotel_b,
            role=StaffMembership.Role.HOUSEKEEPER,
            is_active=True,
        )

        room_type = RoomType.objects.create(
            name="Standard",
            base_price="120.00",
        )

        self.room_a = Room.objects.create(
            hotel=self.hotel_a,
            room_type=room_type,
            room_number="101",
        )
        self.room_b = Room.objects.create(
            hotel=self.hotel_b,
            room_type=room_type,
            room_number="201",
        )

    def test_user_cannot_access_unassigned_hotel(self):
        response = self.client.get(
            "/api/rooms/",
            {"hotel": self.hotel_b.id},
        )

        self.assertEqual(response.status_code, 200)
        room_ids = {item["id"] for item in response.data}
        self.assertIn(self.room_b.id, room_ids)
        self.assertNotIn(self.room_a.id, room_ids)

        unauthorized = self.client.get(
            "/api/rooms/",
            {"hotel": 999999},
        )

        self.assertEqual(unauthorized.status_code, 403)

    def test_creating_hotel_auto_creates_owner_membership(self):
        response = self.client.post(
            "/api/hotels/",
            {
                "name": "Hotel C",
                "address": "C Street",
                "city": "Mbeya",
                "country": "Tanzania",
                "currency": "TZS",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        hotel = Hotel.objects.get(name="Hotel C")

        self.assertTrue(
            StaffMembership.objects.filter(
                user=self.user,
                hotel=hotel,
                role=StaffMembership.Role.OWNER,
                is_active=True,
            ).exists()
        )

    def test_owner_role_is_not_granted_across_unrelated_hotel(self):
        response = self.client.get(
            "/api/staff/",
            {"hotel": self.hotel_b.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["hotel"], self.hotel_b.id)

    def test_rejects_mismatched_hotel_header_and_query(self):
        response = self.client.get(
            "/api/rooms/",
            {"hotel": self.hotel_b.id},
            HTTP_X_HOTEL_ID=self.hotel_a.id,
        )

        self.assertEqual(response.status_code, 403)

    def test_rejects_payload_hotel_override_when_active_hotel_is_set(self):
        room_type = RoomType.objects.create(
            name="Deluxe",
            base_price="180.00",
        )

        response = self.client.post(
            "/api/rooms/",
            {
                "hotel": self.hotel_b.id,
                "room_type": room_type.id,
                "room_number": "102",
                "floor": 1,
                "status": "AVAILABLE",
            },
            format="json",
            HTTP_X_HOTEL_ID=self.hotel_a.id,
        )

        self.assertEqual(response.status_code, 403)

    def test_duplicate_membership_is_rejected_safely(self):
        existing_user = User.objects.create_user(
            email="existing-member@example.com",
            password="password123",
            first_name="Existing",
            last_name="Member",
        )
        StaffMembership.objects.create(
            user=existing_user,
            hotel=self.hotel_a,
            role=StaffMembership.Role.RECEPTIONIST,
            is_active=True,
        )

        response = self.client.post(
            "/api/auth/staff/",
            {
                "email": existing_user.email,
                "first_name": "Existing",
                "last_name": "Member",
                "phone": "000",
                "password": "password123",
                "hotel": self.hotel_a.id,
                "role": StaffMembership.Role.MANAGER,
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("already belongs", str(response.data))

    def test_portfolio_overview_lists_only_authorized_hotels(self):
        unauthorized_hotel = Hotel.objects.create(
            name="Hotel C",
            address="C Street",
            city="Dar es Salaam",
        )

        response = self.client.get("/api/portfolio/overview/")

        self.assertEqual(response.status_code, 200)
        hotel_ids = [item["hotel_id"] for item in response.data["properties"]]
        self.assertIn(self.hotel_a.id, hotel_ids)
        self.assertIn(self.hotel_b.id, hotel_ids)
        self.assertNotIn(unauthorized_hotel.id, hotel_ids)

    def test_portfolio_overview_excludes_inactive_or_missing_memberships(self):
        unauth_hotel = Hotel.objects.create(
            name="Hotel D",
            address="D Street",
            city="Mbeya",
        )
        StaffMembership.objects.create(
            user=self.user,
            hotel=unauth_hotel,
            role=StaffMembership.Role.MANAGER,
            is_active=False,
        )

        response = self.client.get("/api/portfolio/overview/")

        self.assertEqual(response.status_code, 200)
        hotel_ids = [item["hotel_id"] for item in response.data["properties"]]
        self.assertNotIn(unauth_hotel.id, hotel_ids)
        self.assertNotIn(999999, hotel_ids)
