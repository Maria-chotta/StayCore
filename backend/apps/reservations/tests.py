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



class ReservationLifecycleAPITest(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient

        self.client = APIClient()
        self.hotel = Hotel.objects.create(name="Life Hotel", address="a", city="c")
        self.room_type = RoomType.objects.create(name="Standard", base_price="50.00")
        self.room = Room.objects.create(
            hotel=self.hotel, room_type=self.room_type, room_number="101"
        )
        self.guest = Guest.objects.create(
            hotel=self.hotel, first_name="Ann", last_name="Lee", email="ann@example.com"
        )
        self.user = User.objects.create_user(email="staff@example.com", password="pass12345")
        StaffMembership.objects.create(
            user=self.user, hotel=self.hotel, role="MANAGER", is_active=True
        )
        self.client.force_authenticate(user=self.user)
        self.reservation = Reservation.objects.create(
            hotel=self.hotel,
            guest=self.guest,
            room=self.room,
            check_in_date=timezone.localdate(),
            check_out_date=timezone.localdate() + timezone.timedelta(days=2),
        )

    def _post(self, action):
        return self.client.post(f"/api/reservations/{self.reservation.id}/{action}/")

    def _room_status(self):
        self.room.refresh_from_db()
        return self.room.status

    def test_full_lifecycle_pending_to_checked_out(self):
        self.assertEqual(self._post("confirm").status_code, 200)
        self.reservation.refresh_from_db()
        self.assertEqual(self.reservation.status, Reservation.Status.CONFIRMED)

        self.assertEqual(self._post("check_in").status_code, 200)
        self.reservation.refresh_from_db()
        self.assertEqual(self.reservation.status, Reservation.Status.CHECKED_IN)
        self.assertEqual(self._room_status(), Room.Status.OCCUPIED)

        self.assertEqual(self._post("check_out").status_code, 200)
        self.reservation.refresh_from_db()
        self.assertEqual(self.reservation.status, Reservation.Status.CHECKED_OUT)
        self.assertEqual(self._room_status(), Room.Status.DIRTY)

    def test_check_in_before_confirm_rejected(self):
        res = self._post("check_in")
        self.assertEqual(res.status_code, 400)
        self.reservation.refresh_from_db()
        self.assertEqual(self.reservation.status, Reservation.Status.PENDING)
        self.assertEqual(self._room_status(), Room.Status.AVAILABLE)

    def test_check_out_before_check_in_rejected(self):
        res = self._post("check_out")
        self.assertEqual(res.status_code, 400)

    def test_confirmed_check_in_then_check_in_again_rejected(self):
        self._post("confirm")
        self._post("check_in")
        res = self._post("check_in")
        self.assertEqual(res.status_code, 400)

    def test_checked_out_cannot_check_in_again(self):
        self._post("confirm")
        self._post("check_in")
        self._post("check_out")
        res = self._post("check_in")
        self.assertEqual(res.status_code, 400)

    def test_check_in_while_room_occupied_rejected(self):
        self._post("confirm")
        self.room.status = Room.Status.OCCUPIED
        self.room.save()
        res = self._post("check_in")
        self.assertEqual(res.status_code, 400)
        self.assertIn("not available", str(res.data))

    def test_check_in_while_room_maintenance_rejected(self):
        self._post("confirm")
        self.room.status = Room.Status.MAINTENANCE
        self.room.save()
        res = self._post("check_in")
        self.assertEqual(res.status_code, 400)
        self.assertIn("not available", str(res.data))

    def test_cancelled_reservation_cannot_check_in(self):
        self._post("confirm")
        self._post("cancel")
        res = self._post("check_in")
        self.assertEqual(res.status_code, 400)
        self.reservation.refresh_from_db()
        self.assertEqual(self.reservation.status, Reservation.Status.CANCELLED)

    def test_cancelled_reservation_cannot_be_confirmed(self):
        self._post("cancel")
        res = self._post("confirm")
        self.assertEqual(res.status_code, 400)

    def test_double_booking_rejected(self):
        Reservation.objects.create(
            hotel=self.hotel,
            guest=self.guest,
            room=self.room,
            check_in_date=self.reservation.check_in_date,
            check_out_date=self.reservation.check_out_date,
        )
        res = self.client.post(
            "/api/reservations/",
            {
                "hotel": self.hotel.id,
                "guest": self.guest.id,
                "room": self.room.id,
                "check_in_date": str(self.reservation.check_in_date),
                "check_out_date": str(self.reservation.check_out_date),
                "adults": 1,
                "children": 0,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("not available", str(res.data))

    def test_checkout_before_checkin_dates_rejected(self):
        res = self.client.post(
            "/api/reservations/",
            {
                "hotel": self.hotel.id,
                "guest": self.guest.id,
                "room": self.room.id,
                "check_in_date": "2030-05-10",
                "check_out_date": "2030-05-09",
                "adults": 1,
                "children": 0,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_room_from_other_hotel_rejected(self):
        other_hotel = Hotel.objects.create(name="Other", address="a", city="c")
        other_room = Room.objects.create(
            hotel=other_hotel, room_type=self.room_type, room_number="999"
        )
        res = self.client.post(
            "/api/reservations/",
            {
                "hotel": self.hotel.id,
                "guest": self.guest.id,
                "room": other_room.id,
                "check_in_date": "2030-05-10",
                "check_out_date": "2030-05-12",
                "adults": 1,
                "children": 0,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_unauthenticated_request_rejected(self):
        from rest_framework.test import APIClient as C

        anon = C()
        res = anon.get("/api/reservations/")
        self.assertEqual(res.status_code, 401)

    def test_folio_summary_in_reservation_response(self):
        from apps.billing.models import Folio

        folio = Folio.objects.create(
            reservation=self.reservation, hotel=self.hotel, guest=self.guest
        )
        res = self.client.get(f"/api/reservations/{self.reservation.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["folio"]["id"], folio.id)
        self.assertIn("total_charges", res.data["folio"])
