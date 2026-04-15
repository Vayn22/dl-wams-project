from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from patients.models import Patient
from patients.permissions import CanAddAppointment
from patients.serializers import AppointmentSerializer
from django.shortcuts import get_object_or_404


@api_view(['POST'])
@permission_classes([CanAddAppointment])
def appointment_create(request):
    data = request.data.copy()

    # ✅ AUTO SET DOCTOR
    data['doctor'] = request.user.id

    serializer = AppointmentSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)