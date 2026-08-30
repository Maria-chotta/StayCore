from rest_framework.routers import DefaultRouter

from .views import RoomViewSet, RoomTypeViewSet


router = DefaultRouter()

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