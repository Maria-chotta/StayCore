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
