from rest_framework import serializers
from ai.models import AIModel


class AIModelSerializer(serializers.ModelSerializer):
    specialties = serializers.StringRelatedField(many=True)

    class Meta:
        model = AIModel
        fields = ['id', 'name', 'description', 'type', 'specialties']