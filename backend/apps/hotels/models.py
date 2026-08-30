from django.db import models



class Hotel(models.Model):

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    name = models.CharField(max_length=200)

    description = models.TextField(
        blank=True
    )

    address = models.CharField(
        max_length=255
    )

    city = models.CharField(
        max_length=100
    )

    country = models.CharField(
        max_length=100,
        default="Tanzania"
    )

    phone = models.CharField(
        max_length=20,
        blank=True
    )

    email = models.EmailField(
        blank=True
    )

    currency = models.CharField(
        max_length=3,
        default="TZS"
    )

    timezone = models.CharField(
        max_length=50,
        default="Africa/Dar_es_Salaam"
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.name

    