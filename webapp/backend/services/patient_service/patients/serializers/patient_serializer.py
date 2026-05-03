from rest_framework import serializers

from .medical_file_serializer import MedicalFileSerializer
from ..models import Patient


class PatientSerializer(serializers.ModelSerializer):
    files = MedicalFileSerializer(many=True, read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id",
            "first_name",
            "last_name",
            "age",
            "date_of_birth",
            "gender",
            "blood_type",
            "diagnosis",
            "notes",
            "phone_number",
            "address",
            "assigned_doctor_ids",
            "files",
            "created_by_user_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by_user_id"]
