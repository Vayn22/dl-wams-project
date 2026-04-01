from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from patients.models import Patient
from patients.serializers import PatientSerializer
from users.decorators import any_role


@api_view(['GET'])
@any_role('admin', 'doctor')
def patient_detail(request, pk):
    patient = get_object_or_404(Patient, pk=pk)
    if request.user.role != 'admin' and not patient.doctors.filter(id=request.user.id).exists():
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    serializer = PatientSerializer(patient)
    return Response(serializer.data)
