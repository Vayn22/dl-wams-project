from django.urls import path
from .views import AdminOnlyView, DoctorView

urlpatterns = [
    path('admin-only/', AdminOnlyView.as_view(), name='admin_only'),
    path('doctor/', DoctorView.as_view(), name='doctor'),
]