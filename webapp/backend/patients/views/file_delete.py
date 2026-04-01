from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from patients.models import MedicalFile
from users.decorators import any_role


@api_view(['DELETE'])
@any_role('admin', 'doctor')
def file_delete(request, pk):
    file = get_object_or_404(MedicalFile, pk=pk)
    if request.user.role != 'admin' and file.uploaded_by != request.user:
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    file.file.delete(save=False)
    file.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
