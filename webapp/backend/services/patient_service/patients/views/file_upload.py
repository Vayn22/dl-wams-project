from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from ..models import MedicalFile, Patient
from ..permissions import CanAddMedicalFile
from ..serializers import MedicalFileSerializer


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([CanAddMedicalFile])
def file_upload(request, pk):
    patient = get_object_or_404(Patient, pk=pk)

    serializer = MedicalFileSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(
        patient=patient,
        uploaded_by_user_id=getattr(request.user, "id", None),
    )
    return Response(serializer.data, status=status.HTTP_201_CREATED)
