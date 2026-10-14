from rest_framework.routers import DefaultRouter

from .views import (
    EventPackageViewSet,
    GroupBookingViewSet,
    RatePlanViewSet,
    RoomViewSet,
    RoomTypeViewSet,
)


router = DefaultRouter()

router.register(
    "groups",
    GroupBookingViewSet,
    basename="groups",
)

router.register(
    "event-packages",
    EventPackageViewSet,
    basename="event-packages",
)

router.register(
    "rate-plans",
    RatePlanViewSet,
    basename="rate-plans",
)

router.register(
    "rooms",
    RoomViewSet,
    basename="rooms"
)

router.register(
    "room-types",
    RoomTypeViewSet,
    basename="room-types"
)

urlpatterns = router.urls