from django.urls import path

from .views import segment

urlpatterns = [
    path("segment/", segment),
]