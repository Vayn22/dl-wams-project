from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import Patient
from ..permissions import CanDeletePatient


@api_view(["DELETE"])
@permission_classes([CanDeletePatient])
def patient_delete(request, pk):
    patient = get_object_or_404(Patient, pk=pk)
    patient.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
