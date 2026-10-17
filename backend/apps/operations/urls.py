from rest_framework.routers import DefaultRouter

from apps.operations.views import (
    CashDrawerEntryViewSet,
    CashDrawerShiftViewSet,
    GuestFeedbackViewSet,
    IncidentReportViewSet,
    InventoryItemViewSet,
    InventoryMovementViewSet,
    MarketingCampaignViewSet,
    ProductionRecordViewSet,
)

router = DefaultRouter()
router.register(r"cash-drawer-shifts", CashDrawerShiftViewSet, basename="cash-drawer-shifts")
router.register(r"cash-drawer-entries", CashDrawerEntryViewSet, basename="cash-drawer-entries")
router.register(r"inventory-items", InventoryItemViewSet, basename="inventory-items")
router.register(r"inventory-movements", InventoryMovementViewSet, basename="inventory-movements")
router.register(r"production-records", ProductionRecordViewSet, basename="production-records")
router.register(r"marketing-campaigns", MarketingCampaignViewSet, basename="marketing-campaigns")
router.register(r"guest-feedback", GuestFeedbackViewSet, basename="guest-feedback")
router.register(r"incident-reports", IncidentReportViewSet, basename="incident-reports")

urlpatterns = router.urls
