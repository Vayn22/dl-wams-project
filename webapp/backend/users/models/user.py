from django.contrib.auth.models import AbstractUser
from django.db import models
from .specialty import Specialty


class User(AbstractUser):

    specialty = models.ForeignKey(
        Specialty,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='doctors'
    )

    def __str__(self):
        return self.username

    class Meta:
        permissions = [
            ("assign_group", "Can assign groups to users"), 
            ("activate_user", "Can activate user"),
            ("deactivate_user", "Can deactivate user"),
        ]