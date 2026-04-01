from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from patients.models import Patient, MedicalFile
from patients.serializers import MedicalFileSerializer
from users.decorators import any_role


@api_view(['POST'])
@any_role('admin', 'doctor')
def file_upload(request, pk):
    patient = get_object_or_404(Patient, pk=pk)
    if request.user.role != 'admin' and not patient.doctors.filter(id=request.user.id).exists():
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    serializer = MedicalFileSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(patient=patient, uploaded_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
