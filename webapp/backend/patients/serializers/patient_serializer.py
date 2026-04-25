from rest_framework import serializers
from patients.models import Patient
from .medical_file_serializer import MedicalFileSerializer


class PatientSerializer(serializers.ModelSerializer):
    files = MedicalFileSerializer(many=True, read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id', 'first_name', 'last_name', 'date_of_birth',
            'gender', 'blood_type', 'phone_number', 'address',
            'notes', 'doctors', 'files', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']