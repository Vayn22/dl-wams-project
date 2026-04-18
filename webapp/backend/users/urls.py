from django.urls import path

from .views import (
    login,
    doctor_list,
    doctor_create,
    doctor_detail,
    doctor_update,
    doctor_delete,
    me,
    specialties_list,
)

from users.views.dev_create_user import dev_create_user

urlpatterns = [
    path('login/', login, name='login'),
    path('me/', me, name='me'),

    path('doctors/', doctor_list, name='doctor_list'),
    path('doctors/create/', doctor_create, name='doctor_create'),
    path('doctors/<int:pk>/', doctor_detail, name='doctor_detail'),
    path('doctors/<int:pk>/update/', doctor_update, name='doctor_update'),
    path('doctors/<int:pk>/delete/', doctor_delete, name='doctor_delete'),
    path('specialties/', specialties_list, name='specialties_list'),

    path('dev-create-user/', dev_create_user),
]



