from django.urls import path

from .views import PortfolioOverviewView

urlpatterns = [
    path("portfolio/overview/", PortfolioOverviewView.as_view(), name="portfolio-overview"),
]
