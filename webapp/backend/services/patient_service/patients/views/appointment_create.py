from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..permissions import CanAddAppointment
from ..serializers import AppointmentSerializer


@api_view(["POST"])
@permission_classes([CanAddAppointment])
def appointment_create(request):
    data = request.data.copy()
    data["doctor_user_id"] = getattr(request.user, "id", None)

    serializer = AppointmentSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)
