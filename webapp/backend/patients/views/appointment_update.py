from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from patients.models import Appointment
from patients.permissions import CanChangeAppointment
from patients.serializers import AppointmentSerializer


@api_view(['PUT'])
@permission_classes([CanChangeAppointment])
def appointment_update(request, pk):
    appointment = get_object_or_404(Appointment, pk=pk)

    serializer = AppointmentSerializer(appointment, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)