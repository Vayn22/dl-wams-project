from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import Patient
from ..permissions import CanViewPatient
from ..serializers import PatientSerializer


@api_view(["GET"])
@permission_classes([CanViewPatient])
def patient_detail(request, pk):
    patient = get_object_or_404(Patient, pk=pk)
    return Response(PatientSerializer(patient).data)
