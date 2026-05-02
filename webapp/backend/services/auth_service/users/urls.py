from django.urls import path

from .views import (
    dev_create_user,
    doctor_create,
    doctor_delete,
    doctor_detail,
    doctor_list,
    doctor_update,
    health,
    login,
    me,
    specialties_list,
)

urlpatterns = [
    path("login/", login, name="login"),
    path("me/", me, name="me"),
    path("health/", health, name="health"),
    path("specialties/", specialties_list, name="specialties_list"),
    path("doctors/", doctor_list, name="doctor_list"),
    path("doctors/create/", doctor_create, name="doctor_create"),
    path("doctors/<int:pk>/", doctor_detail, name="doctor_detail"),
    path("doctors/<int:pk>/update/", doctor_update, name="doctor_update"),
    path("doctors/<int:pk>/delete/", doctor_delete, name="doctor_delete"),
    path("dev-create-user/", dev_create_user, name="dev_create_user"),
]
