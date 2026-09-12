from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
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
        hotel_id = self.request.user.resolve_hotel_context(self.request)

        authorized_hotels = StaffMembership.objects.filter(
            user=self.request.user,
            is_active=True,
        ).values_list("hotel_id", flat=True)

        queryset = (
            StaffMembership.objects
            .select_related("user", "hotel")
            .filter(
                hotel_id__in=authorized_hotels,
            )
            .distinct()
        )

        if hotel_id is not None:
            queryset = queryset.filter(hotel_id=hotel_id)

        return queryset