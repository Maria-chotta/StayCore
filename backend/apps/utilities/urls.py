from django.urls import path

from .views import HotelUtilityView

urlpatterns = [
    path("utilities/", HotelUtilityView.as_view(), name="utilities"),
]
