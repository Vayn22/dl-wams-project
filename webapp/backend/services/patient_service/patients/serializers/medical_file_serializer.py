from rest_framework import serializers

from ..models import MedicalFile


class MedicalFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalFile
        fields = ["id", "patient", "label", "file", "uploaded_by_user_id", "uploaded_at"]
        read_only_fields = ["id", "patient", "uploaded_by_user_id", "uploaded_at"]