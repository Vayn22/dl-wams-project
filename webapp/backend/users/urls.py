from django.urls import path
from .views import admin_only, doctor_view, login

urlpatterns = [
    path('admin-only/', admin_only, name='admin_only'),
    path('doctor/', doctor_view, name='doctor'),
    path('login/', login, name='login'),
]