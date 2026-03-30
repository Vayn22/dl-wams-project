from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from patients.models import MedicalFile
from users.permissions import IsAdminOrDoctor


class FileDeleteView(APIView):
    permission_classes = [IsAdminOrDoctor]

    def delete(self, request, pk):
        file = get_object_or_404(MedicalFile, pk=pk)

        # only the uploader or admin can delete
        if request.user.role != 'admin' and file.uploaded_by != request.user:
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        file.file.delete(save=False)  # delete the actual file from disk
        file.delete()  # delete the record from db
        return Response(status=status.HTTP_204_NO_CONTENT)