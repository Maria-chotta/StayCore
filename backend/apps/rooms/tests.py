from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import StaffMembership
from apps.hotels.models import Hotel
from apps.rooms.models import EventPackage, GroupBooking, RatePlan, Room, RoomType


class GroupEventRateModelTests(TestCase):
    def setUp(self):
        self.hotel = Hotel.objects.create(
            name="Sunrise Hotel",
            address="123 Main St",
            city="Dar es Salaam",
            country="Tanzania",
            currency="TZS",
        )
        self.user = get_user_model().objects.create_user(
            email="ops@example.com",
            password="password123",
        )
        StaffMembership.objects.create(
            user=self.user,
            hotel=self.hotel,
            role=StaffMembership.Role.MANAGER,
            is_active=True,
        )

    def test_group_event_rate_models_can_be_created(self):
        group = GroupBooking.objects.create(
            hotel=self.hotel,
            name="Safari Group",
            contact_name="Amina",
            contact_phone="+255700000001",
            group_size=18,
            start_date="2026-10-01",
            end_date="2026-10-04",
            status=GroupBooking.Status.CONFIRMED,
        )
        package = EventPackage.objects.create(
            hotel=self.hotel,
            name="Wedding Weekend",
            price="280000.00",
            is_active=True,
        )
        rate = RatePlan.objects.create(
            hotel=self.hotel,
            name="Group Special",
            rate_type=RatePlan.Type.GROUP,
            price="150000.00",
            start_date="2026-10-01",
            end_date="2026-10-31",
            is_active=True,
        )

        self.assertEqual(str(group), "Safari Group")
        self.assertEqual(str(package), "Wedding Weekend")
        self.assertEqual(str(rate), "Group Special")
        self.assertEqual(group.hotel, self.hotel)
        self.assertEqual(package.hotel, self.hotel)
        self.assertEqual(rate.hotel, self.hotel)


class RoomSummaryEndpointTests(TestCase):
    def setUp(self):
        self.hotel = Hotel.objects.create(
            name="Blue Pearl",
            address="12 Ocean Ave",
            city="Dodoma",
            country="Tanzania",
        )
        self.user = get_user_model().objects.create_user(
            email="rooms@example.com",
            password="password123",
        )
        StaffMembership.objects.create(
            user=self.user,
            hotel=self.hotel,
            role=StaffMembership.Role.MANAGER,
            is_active=True,
        )
        self.room_type = RoomType.objects.create(
            name="Deluxe",
            description="Test room",
            max_occupancy=2,
            base_price=150000,
        )

        Room.objects.create(
            hotel=self.hotel,
            room_type=self.room_type,
            room_number="101",
            floor=1,
            status=Room.Status.AVAILABLE,
        )
        Room.objects.create(
            hotel=self.hotel,
            room_type=self.room_type,
            room_number="102",
            floor=1,
            status=Room.Status.OCCUPIED,
        )
        Room.objects.create(
            hotel=self.hotel,
            room_type=self.room_type,
            room_number="103",
            floor=1,
            status=Room.Status.MAINTENANCE,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_room_summary_returns_status_counts(self):
        response = self.client.get("/api/rooms/summary/")

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["total_rooms"], 3)
        self.assertEqual(response.data["available"], 1)
        self.assertEqual(response.data["occupied"], 1)
        self.assertEqual(response.data["maintenance"], 1)

    def test_room_can_be_created_for_active_hotel(self):
        response = self.client.post(
            "/api/rooms/",
            {
                "hotel": self.hotel.id,
                "room_type": self.room_type.id,
                "room_number": "104",
                "floor": 1,
                "status": Room.Status.AVAILABLE,
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["hotel"], self.hotel.id)
        self.assertTrue(Room.objects.filter(hotel=self.hotel, room_number="104").exists())

    def test_room_creation_rejects_conflicting_hotel_header(self):
        other_hotel = Hotel.objects.create(
            name="Other Hotel",
            address="45 Side St",
            city="Dodoma",
            country="Tanzania",
        )

        response = self.client.post(
            "/api/rooms/",
            {
                "hotel": self.hotel.id,
                "room_type": self.room_type.id,
                "room_number": "104",
                "floor": 1,
            },
            format="json",
            HTTP_X_HOTEL_ID=str(other_hotel.id),
        )

        self.assertEqual(response.status_code, 403, response.data)
        self.assertIn("mismatch", response.data["detail"].lower())
