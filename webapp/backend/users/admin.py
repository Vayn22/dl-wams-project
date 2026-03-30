from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Specialty


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Role & Specialty', {'fields': ('role', 'specialty')}),
    )
    list_display = ['username', 'email', 'role', 'specialty', 'is_staff']


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']