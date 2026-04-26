from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from ..models import Patient
from ..serializers.patient_serializer import PatientSerializer


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by("-id")
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user_id = getattr(self.request.user, "id", None)
        serializer.save(created_by_user_id=user_id)
