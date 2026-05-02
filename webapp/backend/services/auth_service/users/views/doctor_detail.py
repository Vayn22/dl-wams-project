from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..permissions import IsAdminUserGroup
from ..serializers import DoctorSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUserGroup])
def doctor_detail(request, pk):
    doctor = get_object_or_404(User, pk=pk, groups__name="Doctor")
    return Response(DoctorSerializer(doctor).data)
