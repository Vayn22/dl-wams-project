from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from patients.models import Appointment
from patients.permissions import CanViewAppointment
from patients.serializers import AppointmentSerializer


@api_view(["GET"])
@permission_classes([CanViewAppointment])
def appointment_detail(request, pk):
    try:
        appointment = Appointment.objects.get(pk=pk)
    except Appointment.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)

    serializer = AppointmentSerializer(appointment)
    return Response(serializer.data)
