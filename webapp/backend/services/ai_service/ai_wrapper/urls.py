from django.urls import include, path

from unet.health import health          # ← fix: import from health, not views

urlpatterns = [
    path("api/health/", health, name="health"),
    path("api/", include("unet.urls")),
]