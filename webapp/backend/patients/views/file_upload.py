from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from patients.models import Patient, MedicalFile
from patients.serializers import MedicalFileSerializer
from users.permissions import IsAdminOrDoctor


class FileUploadView(APIView):
    permission_classes = [IsAdminOrDoctor]

    def post(self, request, pk):
        patient = get_object_or_404(Patient, pk=pk)

        # only doctors on the list or admins can upload
        if request.user.role != 'admin' and not patient.doctors.filter(id=request.user.id).exists():
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = MedicalFileSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(patient=patient, uploaded_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)