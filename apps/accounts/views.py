from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .models import User, StaffMembership
from .permissions.permissions import IsOwnerOrManager
from .serializers import (
    UserSerializer,
    LoginSerializer,
    StaffSerializer,
)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer


class RefreshTokenView(TokenRefreshView):
    pass


class StaffViewSet(viewsets.ModelViewSet):
    serializer_class = StaffSerializer
    permission_classes = [
        IsAuthenticated,
        IsOwnerOrManager,
    ]

    def get_queryset(self):
        return (
            StaffMembership.objects
            .select_related("user", "hotel")
            .filter(
                hotel__staff_memberships__user=self.request.user,
                hotel__staff_memberships__is_active=True,
            )
            .distinct()
        )