from django.db import models


class AIModel(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    specialties = models.ManyToManyField(
        "users.Specialty",
        related_name="ai_models"
    )

    type = models.CharField(
        max_length=50,
        choices=[
            ("image", "Image"),
            ("text", "Text"),
        ],
        default="image"
    )

    code = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        permissions = [
            ("view_ai_model", "Can view AI models"),
            ("run_ai_model", "Can run AI models"),
        ]