from django.db import models
from django.utils import timezone
from users.models import User
from .patient import Patient


class Appointment(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'
        EXPIRED = 'expired', 'Expired'

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments')
    date_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def check_expiry(self):
        if self.status == self.Status.SCHEDULED and self.date_time < timezone.now():
            self.status = self.Status.EXPIRED
            self.save(update_fields=["status"])

    def save(self, *args, **kwargs):
        # ✅ Auto-expire BEFORE saving
        if self.status == self.Status.SCHEDULED and self.date_time < timezone.now():
            self.status = self.Status.EXPIRED

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.patient} — Dr.{self.doctor.username} — {self.date_time}"

    class Meta:
        permissions = [
            ("cancel_appointment", "Can cancel appointment"),
            ("reschedule_appointment", "Can reschedule appointment"),
        ]