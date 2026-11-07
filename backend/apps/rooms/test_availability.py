from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import StaffMembership, User
from apps.guests.models import Guest
from apps.hotels.models import Hotel
from apps.reservations.models import Reservation
from apps.rooms.models import Room, RoomType


class AvailabilityMatrixTests(TestCase):
    def setUp(self):
        self.hotel = Hotel.objects.create(
            name="Availability Lodge",
            address="1 Beach Road",
            city="Dar es Salaam",
        )
        self.user = User.objects.create_user(email="availability@example.com", password="test-password")
        StaffMembership.objects.create(user=self.user, hotel=self.hotel, role=StaffMembership.Role.MANAGER)
        self.room_type = RoomType.objects.create(name="Standard", base_price=100)
        self.available_room = Room.objects.create(
            hotel=self.hotel,
            room_type=self.room_type,
            room_number="101",
        )
        self.reserved_room = Room.objects.create(
            hotel=self.hotel,
            room_type=self.room_type,
            room_number="102",
        )
        self.maintenance_room = Room.objects.create(
            hotel=self.hotel,
            room_type=self.room_type,
            room_number="103",
            status=Room.Status.MAINTENANCE,
        )
        guest = Guest.objects.create(hotel=self.hotel, first_name="Alex", last_name="Guest")
        Reservation.objects.create(
            hotel=self.hotel,
            guest=guest,
            room=self.reserved_room,
            check_in_date=date(2026, 10, 26),
            check_out_date=date(2026, 10, 28),
            status=Reservation.Status.CONFIRMED,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_matrix_counts_reserved_and_out_of_service_rooms_per_day(self):
        response = self.client.get(
            "/api/rooms/availability/",
            {"start_date": "2026-10-26", "days": 3},
        )

        self.assertEqual(response.status_code, 200, response.data)
        room_type = response.data["room_types"][0]
        self.assertEqual(room_type["total_rooms"], 3)
        self.assertEqual(room_type["days"][0]["reserved"], 1)
        self.assertEqual(room_type["days"][0]["unavailable"], 1)
        self.assertEqual(room_type["days"][0]["available"], 1)
        self.assertEqual(room_type["days"][1]["available"], 1)
        self.assertEqual(room_type["days"][2]["reserved"], 0)

    def test_matrix_rejects_ranges_over_31_days(self):
        response = self.client.get(
            "/api/rooms/availability/",
            {"start_date": "2026-10-26", "days": 32},
        )

        self.assertEqual(response.status_code, 400)

    def test_matrix_requires_an_explicit_property_for_multi_hotel_users(self):
        other_hotel = Hotel.objects.create(name="Second Lodge", address="2 Beach Road", city="Dar es Salaam")
        StaffMembership.objects.create(user=self.user, hotel=other_hotel, role=StaffMembership.Role.MANAGER)

        response = self.client.get(
            "/api/rooms/availability/",
            {"start_date": "2026-10-26", "days": 1},
        )

        self.assertEqual(response.status_code, 400)
