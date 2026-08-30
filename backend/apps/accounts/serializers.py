from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, StaffMembership
from apps.hotels.models import Hotel


class LoginSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)

        memberships = (
            StaffMembership.objects
            .filter(
                user=self.user,
                is_active=True,
            )
            .select_related("hotel")
        )

        data["user"] = {
            "id": self.user.id,
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "phone": self.user.phone,
            "memberships": [
                {
                    "hotel": membership.hotel.id,
                    "hotel_name": membership.hotel.name,
                    "role": membership.role,
                }
                for membership in memberships
            ],
        }

        return data

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
        ]


class StaffSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email")
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    phone = serializers.CharField(
        source="user.phone",
        allow_blank=True,
        allow_null=True,
        required=False,
    )
    hotel_name = serializers.CharField(
        source="hotel.name",
        read_only=True,
    )
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
    )

    class Meta:
        model = StaffMembership
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "password",
            "hotel",
            "hotel_name",
            "role",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "hotel_name",
            "created_at",
            "updated_at",
        ]

    def validate_email(self, value):
        user = self.instance.user if self.instance else None

        queryset = User.objects.filter(email__iexact=value)

        if user:
            queryset = queryset.exclude(pk=user.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        return value

    def validate_hotel(self, hotel):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Authentication is required."
            )

        membership = StaffMembership.objects.filter(
            user=request.user,
            hotel=hotel,
            is_active=True,
            role__in=[
                StaffMembership.Role.OWNER,
                StaffMembership.Role.MANAGER,
            ],
        ).first()

        if not membership:
            raise serializers.ValidationError(
                "You do not have permission to manage staff for this hotel."
            )

        return hotel

    def validate_role(self, role):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Authentication is required."
            )

        hotel_id = None
        if self.instance:
            hotel_id = self.instance.hotel_id
        else:
            hotel_id = self.initial_data.get("hotel")

        if not hotel_id:
            raise serializers.ValidationError(
                "Hotel is required."
            )

        membership = StaffMembership.objects.filter(
            user=request.user,
            hotel_id=hotel_id,
            is_active=True,
        ).first()

        if not membership:
            raise serializers.ValidationError(
                "You do not have permission to manage staff for this hotel."
            )

        user_role = membership.role

        if user_role == StaffMembership.Role.OWNER:
            allowed_roles = {
                StaffMembership.Role.MANAGER,
                StaffMembership.Role.RECEPTIONIST,
                StaffMembership.Role.ACCOUNTANT,
                StaffMembership.Role.HOUSEKEEPER,
                StaffMembership.Role.MAINTENANCE,
            }
        elif user_role == StaffMembership.Role.MANAGER:
            allowed_roles = {
                StaffMembership.Role.RECEPTIONIST,
                StaffMembership.Role.ACCOUNTANT,
                StaffMembership.Role.HOUSEKEEPER,
                StaffMembership.Role.MAINTENANCE,
            }
        else:
            raise serializers.ValidationError(
                "You do not have permission to manage staff for this hotel."
            )

        if role not in allowed_roles:
            raise serializers.ValidationError(
                "You are not allowed to assign this role."
            )

        return role

    def create(self, validated_data):
        password = validated_data.pop("password", None)

        user_data = validated_data.pop("user")
        email = user_data["email"]

        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=user_data.get("first_name", ""),
                last_name=user_data.get("last_name", ""),
                phone=user_data.get("phone"),
            )

            membership = StaffMembership.objects.create(
                user=user,
                **validated_data,
            )

        return membership

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        password = validated_data.pop("password", None)

        user = instance.user

        if "email" in user_data:
            user.email = user_data["email"]

        if "first_name" in user_data:
            user.first_name = user_data["first_name"]

        if "last_name" in user_data:
            user.last_name = user_data["last_name"]

        if "phone" in user_data:
            user.phone = user_data["phone"]

        if password:
            user.set_password(password)

        user.save()

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()

        return instance