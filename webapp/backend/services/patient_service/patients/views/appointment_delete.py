from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import Appointment
from ..permissions import CanDeleteAppointment


@api_view(["DELETE"])
@permission_classes([CanDeleteAppointment])
def appointment_delete(request, pk):
    appointment = get_object_or_404(Appointment, pk=pk)
    appointment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
