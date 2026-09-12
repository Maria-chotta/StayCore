from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from rest_framework.exceptions import PermissionDenied


class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email address is required")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(
                "Superuser must have is_staff=True"
            )

        if extra_fields.get("is_superuser") is not True:
            raise ValueError(
                "Superuser must have is_superuser=True"
            )

        return self.create_user(
            email=email,
            password=password,
            **extra_fields
        )


class User(AbstractUser):

    username = None

    email = models.EmailField(
        unique=True
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

    def hotel_ids(self):
        return list(
            StaffMembership.objects.filter(
                user=self,
                is_active=True,
            ).values_list("hotel_id", flat=True)
        )

    def has_hotel_access(self, hotel_id):
        if hotel_id in (None, ""):
            return False

        try:
            hotel_id = int(hotel_id)
        except (TypeError, ValueError):
            return False

        return StaffMembership.objects.filter(
            user=self,
            hotel_id=hotel_id,
            is_active=True,
        ).exists()

    def resolve_hotel_context(self, request=None, explicit_hotel=None):
        hotel_ids = []

        if request is not None:
            if hasattr(request, "query_params"):
                query_hotel = request.query_params.get("hotel")
                if query_hotel not in (None, ""):
                    hotel_ids.append(str(query_hotel))

                header_hotel = request.headers.get("X-Hotel-ID")
                if header_hotel not in (None, ""):
                    hotel_ids.append(str(header_hotel))

            if hasattr(request, "data"):
                payload_hotel = request.data.get("hotel") if hasattr(request.data, "get") else None
                if payload_hotel not in (None, ""):
                    hotel_ids.append(str(payload_hotel))

        if explicit_hotel not in (None, ""):
            hotel_ids.append(str(explicit_hotel))

        if not hotel_ids:
            return None

        unique_hotel_ids = set()
        for hotel_id in hotel_ids:
            try:
                unique_hotel_ids.add(str(int(hotel_id)))
            except (TypeError, ValueError):
                unique_hotel_ids.add(str(hotel_id))

        if len(unique_hotel_ids) > 1:
            raise PermissionDenied("Hotel context mismatch. The selected hotel does not match the active hotel.")

        resolved_hotel_id = next(iter(unique_hotel_ids))

        if not self.has_hotel_access(resolved_hotel_id):
            raise PermissionDenied("You do not have access to this hotel.")

        return int(resolved_hotel_id) if resolved_hotel_id.isdigit() else resolved_hotel_id


class StaffMembership(models.Model):

    class Role(models.TextChoices):
        OWNER = "OWNER", "Owner"
        MANAGER = "MANAGER", "Manager"
        RECEPTIONIST = "RECEPTIONIST", "Receptionist"
        ACCOUNTANT = "ACCOUNTANT", "Accountant"
        HOUSEKEEPER = "HOUSEKEEPER", "Housekeeper"
        MAINTENANCE = "MAINTENANCE", "Maintenance"

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="staff_memberships"
    )

    hotel = models.ForeignKey(
        "hotels.Hotel",
        on_delete=models.CASCADE,
        related_name="staff_memberships"
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "hotel"],
                name="unique_user_hotel_membership"
            )
        ]

    def __str__(self):
        return f"{self.user.email} - {self.hotel.name} ({self.role})"