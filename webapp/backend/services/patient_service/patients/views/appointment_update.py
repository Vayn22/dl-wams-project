from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import Appointment
from ..permissions import CanChangeAppointment
from ..serializers import AppointmentSerializer


@api_view(["PUT", "PATCH"])
@permission_classes([CanChangeAppointment])
def appointment_update(request, pk):
    appointment = get_object_or_404(Appointment, pk=pk)
    serializer = AppointmentSerializer(appointment, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_200_OK)
