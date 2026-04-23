from rest_framework import serializers
from patients.models import MedicalFile


class MedicalFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalFile
        fields = ["id", "label", "file", "uploaded_by", "uploaded_at"]
        read_only_fields = ["uploaded_by", "uploaded_at"]
