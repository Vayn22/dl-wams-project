from django.db import models
from users.models import User
from .patient import Patient


class MedicalFile(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='medical_files/')
    label = models.CharField(max_length=100)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_files')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.label} - {self.patient}"

    class Meta:
        permissions = [
            ("download_medicalfile", "Can download medical file"),
        ]