from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class HouseAccount(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    hotel = models.ForeignKey("hotels.Hotel", on_delete=models.CASCADE, related_name="house_accounts")
    name = models.CharField(max_length=180)
    contact_name = models.CharField(max_length=160, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["hotel", "name"], name="unique_house_account_name_per_hotel")]

    @property
    def balance(self):
        totals = self.activities.aggregate(
            charges=models.Sum("amount", filter=models.Q(activity_type=HouseAccountActivity.ActivityType.CHARGE)),
            settlements=models.Sum("amount", filter=models.Q(activity_type=HouseAccountActivity.ActivityType.SETTLEMENT)),
        )
        return (totals["charges"] or Decimal("0.00")) - (totals["settlements"] or Decimal("0.00"))


class HouseAccountActivity(models.Model):
    class ActivityType(models.TextChoices):
        CHARGE = "CHARGE", "Charge"
        SETTLEMENT = "SETTLEMENT", "Settlement"

    account = models.ForeignKey(HouseAccount, on_delete=models.PROTECT, related_name="activities")
    activity_type = models.CharField(max_length=12, choices=ActivityType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    description = models.CharField(max_length=255)
    reference = models.CharField(max_length=100, blank=True)
    transaction_date = models.DateField()
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-transaction_date", "-created_at"]


class LedgerAccount(models.Model):
    class AccountType(models.TextChoices):
        ASSET = "ASSET", "Asset"
        LIABILITY = "LIABILITY", "Liability"
        EQUITY = "EQUITY", "Equity"
        REVENUE = "REVENUE", "Revenue"
        EXPENSE = "EXPENSE", "Expense"

    hotel = models.ForeignKey("hotels.Hotel", on_delete=models.CASCADE, related_name="ledger_accounts")
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=160)
    account_type = models.CharField(max_length=12, choices=AccountType.choices)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]
        constraints = [models.UniqueConstraint(fields=["hotel", "code"], name="unique_ledger_account_code_per_hotel")]


class JournalEntry(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"

    hotel = models.ForeignKey("hotels.Hotel", on_delete=models.CASCADE, related_name="journal_entries")
    entry_date = models.DateField()
    reference = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=255)
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_journal_entries")
    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="posted_journal_entries")
    created_at = models.DateTimeField(auto_now_add=True)
    posted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-entry_date", "-created_at"]


class JournalLine(models.Model):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name="lines")
    account = models.ForeignKey(LedgerAccount, on_delete=models.PROTECT, related_name="journal_lines")
    description = models.CharField(max_length=255, blank=True)
    debit = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    credit = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])

    class Meta:
        ordering = ["id"]


class BusinessDayClose(models.Model):
    hotel = models.ForeignKey("hotels.Hotel", on_delete=models.CASCADE, related_name="business_day_closes")
    business_date = models.DateField()
    reservations_reviewed = models.BooleanField(default=False)
    payments_reconciled = models.BooleanField(default=False)
    cash_reconciled = models.BooleanField(default=False)
    revenue_reviewed = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    closed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    closed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-business_date"]
        constraints = [models.UniqueConstraint(fields=["hotel", "business_date"], name="unique_business_day_close_per_hotel")]
