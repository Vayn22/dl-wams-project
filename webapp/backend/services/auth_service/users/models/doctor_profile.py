from django.contrib.auth.models import User
from django.db import models

from .specialty import Specialty


class DoctorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="doctor_profile")
    specialty = models.ForeignKey(
        Specialty,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctors",
    )

    def __str__(self) -> str:
        return f"{self.user.username}"
