from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from users.models import User
from users.serializers import DoctorSerializer
from users.permissions import CanViewUser


@api_view(["GET"])
@permission_classes([CanViewUser])
def doctor_list(request):
    doctors = User.objects.filter(groups__name="Doctor")
    serializer = DoctorSerializer(doctors, many=True)
    return Response(serializer.data)
