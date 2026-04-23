from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from users.models import User
from users.permissions import CanDeleteUser


@api_view(["DELETE"])
@permission_classes([CanDeleteUser])
def doctor_delete(request, pk):
    doctor = get_object_or_404(User, pk=pk, groups__name="Doctor")
    doctor.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
