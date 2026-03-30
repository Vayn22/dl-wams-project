from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        DOCTOR = 'doctor', 'Doctor'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.DOCTOR,
    )
    specialty = models.ForeignKey(
        'users.Specialty',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='doctors'
    )

    def __str__(self):
        return f"{self.username} ({self.role})"