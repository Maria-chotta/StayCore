from rest_framework.routers import DefaultRouter

from .views import (
    FolioViewSet,
    FolioItemViewSet,
    PaymentViewSet,
)

router = DefaultRouter()

router.register(
    "folios",
    FolioViewSet,
    basename="folios"
)

router.register(
    "folio-items",
    FolioItemViewSet,
    basename="folio-items"
)

router.register(
    "payments",
    PaymentViewSet,
    basename="payments"
)

urlpatterns = router.urls

