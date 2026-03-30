from rest_framework import serializers
from patients.models import Patient


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            'id', 'first_name', 'last_name', 'date_of_birth',
            'gender', 'blood_type', 'phone_number', 'address',
            'notes', 'doctors', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']