from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    LoginView,
    RefreshTokenView,
    StaffViewSet,
)


router = DefaultRouter()

router.register(
    "staff",
    StaffViewSet,
    basename="staff",
)


urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshTokenView.as_view(), name="refresh"),
    path("", include(router.urls)),
]