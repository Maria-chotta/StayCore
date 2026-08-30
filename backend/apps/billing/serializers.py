from rest_framework import serializers

from .models import Folio, FolioItem, Payment


class FolioItemSerializer(serializers.ModelSerializer):

    total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = FolioItem

        fields = [
            "id",
            "folio",
            "description",
            "item_type",
            "quantity",
            "unit_price",
            "total",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "total",
            "created_at",
        ]


class PaymentSerializer(serializers.ModelSerializer):

    class Meta:
        model = Payment

        fields = [
            "id",
            "folio",
            "amount",
            "method",
            "status",
            "reference",
            "received_by",
            "paid_at",
            "notes",
        ]

        read_only_fields = [
            "id",
            "received_by",
            "paid_at",
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Payment amount must be greater than zero."
            )

        return value

    def validate(self, attrs):
        folio = attrs.get("folio", self.instance.folio if self.instance else None)
        amount = attrs.get(
            "amount",
            self.instance.amount if self.instance else None,
        )

        if folio and amount is not None and self.instance is None:
            # Refunded/failed payments do not change the balance.
            from .models import Payment

            outstanding = folio.balance

            if amount > outstanding:
                raise serializers.ValidationError({
                    "amount": (
                        "Payment cannot exceed the outstanding balance "
                        f"of {outstanding}."
                    )
                })

        return attrs


class FolioSerializer(serializers.ModelSerializer):

    total_charges = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )

    total_paid = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )

    balance = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = Folio

        fields = [
            "id",
            "reservation",
            "hotel",
            "guest",
            "status",
            "notes",
            "total_charges",
            "total_paid",
            "balance",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "total_charges",
            "total_paid",
            "balance",
            "created_at",
            "updated_at",
        ]
