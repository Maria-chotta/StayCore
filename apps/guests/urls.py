from rest_framework.routers import DefaultRouter

from .views import GuestViewSet


router = DefaultRouter()

router.register(
    "guests",
    GuestViewSet,
    basename="guests"
)

urlpatterns = router.urls
