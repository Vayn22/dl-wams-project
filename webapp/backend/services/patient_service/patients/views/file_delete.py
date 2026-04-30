from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import MedicalFile
from ..permissions import CanDeleteMedicalFile


@api_view(["DELETE"])
@permission_classes([CanDeleteMedicalFile])
def file_delete(request, pk):
    file_obj = get_object_or_404(MedicalFile, pk=pk)
    if file_obj.file:
        file_obj.file.delete(save=False)
    file_obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
