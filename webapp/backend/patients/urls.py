from django.urls import path
from .views import (
    PatientListView,
    PatientCreateView,
    PatientDetailView,
    PatientUpdateView,
    PatientDeleteView,
    FileUploadView,
    FileDeleteView,
)

urlpatterns = [
    path('', PatientListView.as_view(), name='patient_list'),
    path('create/', PatientCreateView.as_view(), name='patient_create'),
    path('<int:pk>/', PatientDetailView.as_view(), name='patient_detail'),
    path('<int:pk>/update/', PatientUpdateView.as_view(), name='patient_update'),
    path('<int:pk>/delete/', PatientDeleteView.as_view(), name='patient_delete'),
    path('<int:pk>/files/upload/', FileUploadView.as_view(), name='file_upload'),
    path('files/<int:pk>/delete/', FileDeleteView.as_view(), name='file_delete'),
]