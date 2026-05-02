from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..permissions import IsAdminUserGroup
from ..serializers import DoctorSerializer


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUserGroup])
def doctor_create(request):
    serializer = DoctorSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    doctor = serializer.save()
    return Response(DoctorSerializer(doctor).data, status=status.HTTP_201_CREATED)
