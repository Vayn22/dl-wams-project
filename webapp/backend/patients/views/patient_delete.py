from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from patients.models import Patient
from users.decorators import any_role


@api_view(['DELETE'])
@any_role('admin')
def patient_delete(request, pk):
    patient = get_object_or_404(Patient, pk=pk)
    patient.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
