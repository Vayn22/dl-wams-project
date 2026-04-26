from django.urls import path

from .views.health import HealthView
from .views.me import MeView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("health/", HealthView.as_view(), name="health"),
]