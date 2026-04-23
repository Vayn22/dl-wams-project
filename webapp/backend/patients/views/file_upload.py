from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from patients.models import Patient
from patients.permissions import CanAddMedicalFile
from patients.serializers import MedicalFileSerializer


@api_view(["POST"])
@permission_classes([CanAddMedicalFile])
def file_upload(request, pk):
    patient = get_object_or_404(Patient, pk=pk)

    serializer = MedicalFileSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(patient=patient, uploaded_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
