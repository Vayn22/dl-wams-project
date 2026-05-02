from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import Appointment
from ..permissions import CanViewAppointment
from ..serializers import AppointmentSerializer


@api_view(["GET"])
@permission_classes([CanViewAppointment])
def appointment_detail(request, pk):
    appointment = get_object_or_404(Appointment, pk=pk)
    return Response(AppointmentSerializer(appointment).data)
