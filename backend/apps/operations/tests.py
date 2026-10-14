from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import StaffMembership, User
from apps.hotels.models import Hotel
from apps.operations.models import InventoryItem, InventoryMovement


class ProductionRecordStockFlowTests(TestCase):
    def setUp(self):
        self.hotel = Hotel.objects.create(
            name="Sunrise Lodge",
            address="123 Coast Road",
            city="Dar es Salaam",
            country="Tanzania",
        )
        self.user = User.objects.create_user(email="ops@example.com", password="pass1234")
        StaffMembership.objects.create(user=self.user, hotel=self.hotel, role=StaffMembership.Role.MANAGER, is_active=True)
        self.item = InventoryItem.objects.create(
            hotel=self.hotel,
            name="Rice",
            sku="RICE-001",
            category="Kitchen",
            quantity=15,
            reorder_level=5,
            unit_cost=2.50,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_production_record_consumes_stock_and_logs_movement(self):
        response = self.client.post(
            "/api/production-records/",
            {
                "hotel": self.hotel.id,
                "item": self.item.id,
                "name": "Lunch prep",
                "outlet": "Kitchen",
                "quantity": 4,
                "unit": "kg",
                "produced_at": "2026-10-08T12:00:00Z",
                "notes": "Prepared lunch special",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.item.refresh_from_db()
        self.assertEqual(float(self.item.quantity), 11.0)
        self.assertTrue(
            InventoryMovement.objects.filter(
                item=self.item,
                movement_type=InventoryMovement.MovementType.USAGE,
                quantity=4,
            ).exists()
        )
