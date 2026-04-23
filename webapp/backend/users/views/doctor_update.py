from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from users.models import User
from users.permissions import CanChangeUser
from users.serializers import DoctorSerializer


@api_view(["PUT"])
@permission_classes([CanChangeUser])
def doctor_update(request, pk):
    doctor = get_object_or_404(User, pk=pk, groups__name="Doctor")

    serializer = DoctorSerializer(doctor, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
