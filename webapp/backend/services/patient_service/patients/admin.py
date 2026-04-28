from django.contrib import admin

from .models import Appointment, MedicalFile, Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("id", "first_name", "last_name", "phone_number", "created_by_user_id", "created_at")
    search_fields = ("first_name", "last_name", "phone_number")
    list_filter = ("gender",)


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "doctor_user_id", "date_time", "status")
    search_fields = ("patient__first_name", "patient__last_name")
    list_filter = ("status",)


@admin.register(MedicalFile)
class MedicalFileAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "patient", "uploaded_by_user_id", "uploaded_at")
    search_fields = ("label", "patient__first_name", "patient__last_name")
