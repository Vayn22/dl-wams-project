from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Specialty


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "is_staff", "is_active")
    list_filter = ("is_staff", "is_active", "groups")

    fieldsets = UserAdmin.fieldsets + (("Additional Info", {"fields": ("specialty",)}),)

    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Additional Info", {"fields": ("specialty",)}),
    )


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ("name",)
