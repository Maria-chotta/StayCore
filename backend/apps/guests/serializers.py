from rest_framework import serializers
from .models import Guest
from apps.accounts.models import StaffMembership


class GuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest

        fields = [
            "id",
            "hotel",
            "first_name",
            "last_name",
            "email",
            "phone",
            "gender",
            "date_of_birth",
            "nationality",
            "address",
            "city",
            "country",
            "identification_type",
            "identification_number",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication is required.")

        hotel = attrs.get(
            "hotel",
            self.instance.hotel if self.instance else None
        )

        if hotel:
            has_access = StaffMembership.objects.filter(
                user=request.user,
                hotel=hotel,
                is_active=True,
            ).exists()
            if not has_access:
                raise serializers.ValidationError({
                    "hotel": "You do not have access to this hotel."
                })

        identification_number = attrs.get(
            "identification_number",
            self.instance.identification_number
            if self.instance else ""
        )

        # Prevent the same identification number from being
        # registered twice within the same hotel.
        if hotel and identification_number:
            queryset = Guest.objects.filter(
                hotel=hotel,
                identification_number=identification_number,
            )

            if self.instance:
                queryset = queryset.exclude(
                    pk=self.instance.pk
                )

            if queryset.exists():
                raise serializers.ValidationError({
                    "identification_number": (
                        "A guest with this identification number "
                        "already exists in this hotel."
                    )
                })

        return attrs
