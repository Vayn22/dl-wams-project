from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from patients.models import Patient
from patients.permissions import CanViewPatient
from patients.serializers import PatientSerializer


@api_view(['GET'])
@permission_classes([CanViewPatient])
def patient_detail(request, pk):
    patient = get_object_or_404(Patient, pk=pk)
    serializer = PatientSerializer(patient)
    return Response(serializer.data)