from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from patients.models import MedicalFile
from patients.permissions import CanDeleteMedicalFile


@api_view(["DELETE"])
@permission_classes([CanDeleteMedicalFile])
def file_delete(request, pk):
    file = get_object_or_404(MedicalFile, pk=pk)
    file.file.delete(save=False)
    file.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
