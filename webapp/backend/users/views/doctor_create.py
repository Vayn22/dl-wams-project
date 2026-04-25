from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import Group
from users.permissions import CanAddUser
from users.serializers import DoctorSerializer


@api_view(['POST'])
@permission_classes([CanAddUser])
def doctor_create(request):
    serializer = DoctorSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        # ✅ SAFE GROUP CREATION
        doctor_group, _ = Group.objects.get_or_create(name="Doctor")
        user.groups.add(doctor_group)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)