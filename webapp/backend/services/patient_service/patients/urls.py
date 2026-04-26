from django.urls import path
from rest_framework.routers import DefaultRouter

from .views.health import HealthView
from .views.patient_viewset import PatientViewSet

router = DefaultRouter()
router.register(r"patients", PatientViewSet, basename="patients")

urlpatterns = router.urls + [
    path("health/", HealthView.as_view(), name="health"),
]