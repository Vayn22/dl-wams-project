from rest_framework import serializers
from patients.models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "doctor",
            "date_time",
            "status",
            "notes",
            "created_at",
        ]
        read_only_fields = ["doctor", "status", "created_at"]
