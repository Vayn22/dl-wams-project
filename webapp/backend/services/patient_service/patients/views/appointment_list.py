from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import Appointment
from ..permissions import CanViewAppointment
from ..serializers import AppointmentSerializer


@api_view(["GET"])
@permission_classes([CanViewAppointment])
def appointment_list(request):
    appointments = list(Appointment.objects.select_related("patient").all().order_by("-id"))
    for appointment in appointments:
        appointment.check_expiry()
    return Response(AppointmentSerializer(appointments, many=True).data)
