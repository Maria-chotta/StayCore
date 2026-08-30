from rest_framework.routers import DefaultRouter

from .views import HousekeepingTaskViewSet


router = DefaultRouter()

router.register(
    "housekeeping",
    HousekeepingTaskViewSet,
    basename="housekeeping"
)

urlpatterns = router.urls
