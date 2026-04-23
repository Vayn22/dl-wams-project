from django.contrib import admin
from .models import Patient, MedicalFile, Appointment


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ["first_name", "last_name", "gender", "blood_type", "phone_number"]
    search_fields = ["first_name", "last_name", "phone_number"]


@admin.register(MedicalFile)
class MedicalFileAdmin(admin.ModelAdmin):
    list_display = ["label", "patient", "uploaded_by", "uploaded_at"]


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ["patient", "doctor", "date_time", "status"]
    list_filter = ["status"]
