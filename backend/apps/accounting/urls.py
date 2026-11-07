from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AccountingReportsView,
    BusinessDayCloseViewSet,
    HouseAccountActivityViewSet,
    HouseAccountViewSet,
    JournalEntryViewSet,
    LedgerAccountViewSet,
)

router = DefaultRouter()
router.register("house-accounts", HouseAccountViewSet, basename="house-accounts")
router.register("house-account-activities", HouseAccountActivityViewSet, basename="house-account-activities")
router.register("ledger-accounts", LedgerAccountViewSet, basename="ledger-accounts")
router.register("journal-entries", JournalEntryViewSet, basename="journal-entries")
router.register("business-day-closes", BusinessDayCloseViewSet, basename="business-day-closes")

urlpatterns = router.urls + [
    path("accounting-reports/", AccountingReportsView.as_view(), name="accounting-reports"),
]
