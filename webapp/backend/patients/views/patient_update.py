from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from patients.models import Patient
from patients.permissions import CanChangePatient
from patients.serializers import PatientSerializer


@api_view(['PUT'])
@permission_classes([CanChangePatient])
def patient_update(request, pk):
    patient = get_object_or_404(Patient, pk=pk)

    serializer = PatientSerializer(patient, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)