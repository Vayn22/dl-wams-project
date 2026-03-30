from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from patients.models import Patient
from patients.serializers import PatientSerializer
from users.permissions import IsAdminOrDoctor


class PatientDetailView(APIView):
    permission_classes = [IsAdminOrDoctor]

    def get_object(self, pk, user):
        patient = get_object_or_404(Patient, pk=pk)
        if user.role != 'admin' and not patient.doctors.filter(id=user.id).exists():
            return None
        return patient

    def get(self, request, pk):
        patient = self.get_object(pk, request.user)
        if not patient:
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = PatientSerializer(patient)
        return Response(serializer.data)