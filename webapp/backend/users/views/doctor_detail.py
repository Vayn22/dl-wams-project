from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from users.models import User
from users.permissions import CanViewUser
from users.serializers import DoctorSerializer


@api_view(['GET'])
@permission_classes([CanViewUser])
def doctor_detail(request, pk):
    doctor = get_object_or_404(User, pk=pk, groups__name="Doctor")
    serializer = DoctorSerializer(doctor)
    return Response(serializer.data)