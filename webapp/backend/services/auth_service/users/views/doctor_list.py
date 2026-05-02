from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..permissions import IsAdminUserGroup
from ..serializers import DoctorSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUserGroup])
def doctor_list(request):
    doctors = User.objects.filter(groups__name="Doctor").distinct().order_by("id")
    return Response(DoctorSerializer(doctors, many=True).data)
