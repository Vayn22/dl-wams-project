# project/urls.py
from django.urls import include, path

urlpatterns = [
    path("api/", include("unet.urls")),
]
