from django.contrib.auth.models import Group, User
from rest_framework import serializers

from ..models import DoctorProfile, Specialty
from ..rbac import build_permissions, get_doctor_profile


class DoctorSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    specialty_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
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
            "is_active",
            "password",
            "specialty_id",
            "specialty",
            "groups",
            "permissions",
        ]
        read_only_fields = ["id", "groups", "permissions", "specialty"]

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required when creating a doctor."})

        specialty_id = attrs.get("specialty_id")
        if specialty_id not in (None, "") and not Specialty.objects.filter(pk=specialty_id).exists():
            raise serializers.ValidationError({"specialty_id": "Invalid specialty id."})

        return attrs

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

    def _apply_specialty(self, user, specialty_id):
        profile, _ = DoctorProfile.objects.get_or_create(user=user)
        if specialty_id in (None, ""):
            profile.specialty = None
        else:
            profile.specialty = Specialty.objects.get(pk=specialty_id)
        profile.save()

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        specialty_id = validated_data.pop("specialty_id", None)

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        doctor_group, _ = Group.objects.get_or_create(name="Doctor")
        user.groups.add(doctor_group)

        self._apply_specialty(user, specialty_id)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        specialty_id = validated_data.pop("specialty_id", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()

        doctor_group, _ = Group.objects.get_or_create(name="Doctor")
        instance.groups.add(doctor_group)

        if specialty_id is not None:
            self._apply_specialty(instance, specialty_id)

        return instance
