from django.db import models


class Patient(models.Model):
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
    ]

    BLOOD_TYPE_CHOICES = [
        ("A+", "A+"),
        ("A-", "A-"),
        ("B+", "B+"),
        ("B-", "B-"),
        ("AB+", "AB+"),
        ("AB-", "AB-"),
        ("O+", "O+"),
        ("O-", "O-"),
    ]

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    age = models.PositiveIntegerField()
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    blood_type = models.CharField(max_length=5, choices=BLOOD_TYPE_CHOICES, blank=True, null=True)
    diagnosis = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    assigned_doctor_ids = models.JSONField(default=list, blank=True)
    created_by_user_id = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    class Meta:
        permissions = [
            ("export_patient", "Can export patient data"),
            ("archive_patient", "Can archive patient"),
        ]
