from django.test import TestCase
from django.utils import timezone

from apps.reservations.models import Reservation
from apps.reservations.serializers import ReservationSerializer
from apps.hotels.models import Hotel
from apps.rooms.models import RoomType, Room
from apps.guests.models import Guest
from apps.accounts.models import User, StaffMembership


class ReservationSerializerTest(TestCase):
	def setUp(self):
		# Create hotel and related models
		self.hotel = Hotel.objects.create(
			name="Test Hotel",
			address="123 Test St",
			city="Test City",
		)

		self.room_type = RoomType.objects.create(
			name="STANDARD ROOM",
			base_price=100,
		)

		self.room = Room.objects.create(
			hotel=self.hotel,
			room_type=self.room_type,
			room_number="101",
			status=Room.Status.AVAILABLE,
		)

		self.guest = Guest.objects.create(
			hotel=self.hotel,
			first_name="Jane",
			last_name="Doe",
			email="jane@example.com",
			phone="0123456789",
		)

		# Create a user and staff membership so API queries limited by staff membership can find this hotel
		self.user = User.objects.create_user(email="staff@example.com", password="pass")
		StaffMembership.objects.create(user=self.user, hotel=self.hotel, role=StaffMembership.Role.RECEPTIONIST)

		# Create a reservation
		self.reservation = Reservation.objects.create(
			hotel=self.hotel,
			guest=self.guest,
			room=self.room,
			check_in_date=timezone.now().date(),
			check_out_date=(timezone.now() + timezone.timedelta(days=2)).date(),
			status=Reservation.Status.CONFIRMED,
		)

	def test_reservation_serializer_includes_display_fields(self):
		# Fetch with select_related to mimic ViewSet queryset and avoid extra queries
		instance = Reservation.objects.select_related(
			"hotel",
			"guest",
			"room",
			"room__room_type",
		).get(pk=self.reservation.pk)

		data = ReservationSerializer(instance).data

		# Original fields
		self.assertEqual(data["id"], self.reservation.id)
		self.assertEqual(data["guest"], self.guest.id)
		self.assertEqual(data["room"], self.room.id)
		self.assertEqual(data["hotel"], self.hotel.id)
		self.assertEqual(data["status"], self.reservation.status)
		self.assertEqual(data["check_in_date"], str(self.reservation.check_in_date))
		self.assertEqual(data["check_out_date"], str(self.reservation.check_out_date))

		# guest_details
		self.assertIn("guest_details", data)
		gd = data["guest_details"]
		self.assertEqual(gd["id"], self.guest.id)
		self.assertEqual(gd["first_name"], self.guest.first_name)
		self.assertEqual(gd["last_name"], self.guest.last_name)
		self.assertEqual(gd["phone"], self.guest.phone)
		self.assertEqual(gd["email"], self.guest.email)

		# room_details
		self.assertIn("room_details", data)
		rd = data["room_details"]
		self.assertEqual(rd["id"], self.room.id)
		self.assertEqual(rd["room_number"], self.room.room_number)
		self.assertEqual(rd["status"], self.room.status)

		# room_type inside room_details
		self.assertIn("room_type", rd)
		rt = rd["room_type"]
		self.assertEqual(rt["id"], self.room_type.id)
		self.assertEqual(rt["name"], self.room_type.name)

