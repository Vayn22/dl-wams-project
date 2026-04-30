from django.contrib.auth.models import User
from rest_framework import serializers

from ..rbac import build_permissions, get_doctor_profile


class UserMeSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField(read_only=True)
    permissions = serializers.SerializerMethodField(read_only=True)
    specialty = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "groups",
            "permissions",
            "specialty",
        ]

    def get_groups(self, obj):
        return [group.name for group in obj.groups.all()]

    def get_permissions(self, obj):
        return build_permissions(obj)

    def get_specialty(self, obj):
        profile = get_doctor_profile(obj)
        if not profile or not profile.specialty:
            return None
        return {
            "id": profile.specialty.id,
            "name": profile.specialty.name,
            "description": profile.specialty.description,
        }
