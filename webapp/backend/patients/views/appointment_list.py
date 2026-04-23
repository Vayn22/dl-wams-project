from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from patients.models import Appointment
from patients.permissions import CanViewAppointment
from patients.serializers import AppointmentSerializer


@api_view(["GET"])
@permission_classes([CanViewAppointment])
def appointment_list(request):
    appointments = Appointment.objects.all()

    for appointment in appointments:
        appointment.check_expiry()

    serializer = AppointmentSerializer(appointments, many=True)
    return Response(serializer.data)
