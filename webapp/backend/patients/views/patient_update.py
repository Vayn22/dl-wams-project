from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from patients.models import Patient
from patients.serializers import PatientSerializer
from users.permissions import IsAdminOrDoctor


class PatientUpdateView(APIView):
    permission_classes = [IsAdminOrDoctor]

    def put(self, request, pk):
        patient = get_object_or_404(Patient, pk=pk)
        if request.user.role != 'admin' and not patient.doctors.filter(id=request.user.id).exists():
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = PatientSerializer(patient, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)