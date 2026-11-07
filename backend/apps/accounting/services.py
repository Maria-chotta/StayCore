from datetime import date
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import BusinessDayClose


def hotel_local_date(hotel):
    try:
        hotel_timezone = ZoneInfo(hotel.timezone)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValidationError({"hotel": f"Invalid hotel timezone: {hotel.timezone}"}) from exc
    return timezone.localdate(timezone=hotel_timezone)


def ensure_business_day_open(hotel, business_date: date):
    if BusinessDayClose.objects.filter(hotel=hotel, business_date=business_date).exists():
        raise ValidationError({"business_date": f"{business_date} is closed for this hotel."})


def ensure_business_date_range_open(hotel, start_date: date, end_date: date):
    closed_date = BusinessDayClose.objects.filter(
        hotel=hotel,
        business_date__gte=start_date,
        business_date__lt=end_date,
    ).values_list("business_date", flat=True).first()
    if closed_date is not None:
        raise ValidationError({"business_date": f"{closed_date} is closed for this hotel."})
