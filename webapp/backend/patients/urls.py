from django.urls import path
from .views import (
    patient_list,
    patient_create,
    patient_detail,
    patient_update,
    patient_delete,
    file_upload,
    file_delete,
    appointment_list,
    appointment_create,
    appointment_detail,
    appointment_update,
    appointment_delete,
)

urlpatterns = [
    # patients
    path('', patient_list, name='patient_list'),
    path('create/', patient_create, name='patient_create'),
    path('<int:pk>/', patient_detail, name='patient_detail'),
    path('<int:pk>/update/', patient_update, name='patient_update'),
    path('<int:pk>/delete/', patient_delete, name='patient_delete'),
    # files
    path('<int:pk>/files/upload/', file_upload, name='file_upload'),
    path('files/<int:pk>/delete/', file_delete, name='file_delete'),
    # appointments
    path('appointments/', appointment_list, name='appointment_list'),
    path('appointments/create/', appointment_create, name='appointment_create'),
    path('appointments/<int:pk>/', appointment_detail, name='appointment_detail'),
    path('appointments/<int:pk>/update/', appointment_update, name='appointment_update'),
    path('appointments/<int:pk>/delete/', appointment_delete, name='appointment_delete'),
]