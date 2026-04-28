from django.urls import path

from .views import (
    appointment_create,
    appointment_delete,
    appointment_detail,
    appointment_list,
    appointment_update,
    file_delete,
    file_upload,
    health,
    patient_create,
    patient_delete,
    patient_detail,
    patient_list,
    patient_update,
)

urlpatterns = [
    path("health/", health, name="health"),
    path("patients/", patient_list, name="patient_list"),
    path("patients/create/", patient_create, name="patient_create"),
    path("patients/<int:pk>/", patient_detail, name="patient_detail"),
    path("patients/<int:pk>/update/", patient_update, name="patient_update"),
    path("patients/<int:pk>/delete/", patient_delete, name="patient_delete"),
    path("patients/<int:pk>/files/upload/", file_upload, name="file_upload"),
    path("patients/files/<int:pk>/delete/", file_delete, name="file_delete"),
    path("appointments/", appointment_list, name="appointment_list"),
    path("appointments/create/", appointment_create, name="appointment_create"),
    path("appointments/<int:pk>/", appointment_detail, name="appointment_detail"),
    path("appointments/<int:pk>/update/", appointment_update, name="appointment_update"),
    path("appointments/<int:pk>/delete/", appointment_delete, name="appointment_delete"),
]
