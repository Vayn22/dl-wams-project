from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import Patient
from ..permissions import CanChangePatient
from ..serializers import PatientSerializer


@api_view(["PUT", "PATCH"])
@permission_classes([CanChangePatient])
def patient_update(request, pk):
    patient = get_object_or_404(Patient, pk=pk)
    serializer = PatientSerializer(patient, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_200_OK)
