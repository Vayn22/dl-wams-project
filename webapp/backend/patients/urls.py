from django.urls import path
from .views import (
    patient_list,
    patient_create,
    patient_detail,
    patient_update,
    patient_delete,
    file_upload,
    file_delete,
)

urlpatterns = [
    path('', patient_list, name='patient_list'),
    path('create/', patient_create, name='patient_create'),
    path('<int:pk>/', patient_detail, name='patient_detail'),
    path('<int:pk>/update/', patient_update, name='patient_update'),
    path('<int:pk>/delete/', patient_delete, name='patient_delete'),
    path('<int:pk>/files/upload/', file_upload, name='file_upload'),
    path('files/<int:pk>/delete/', file_delete, name='file_delete'),
]