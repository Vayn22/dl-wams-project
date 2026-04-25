from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from patients.models import Patient
from patients.serializers import PatientSerializer
from patients.permissions import CanViewPatient


@api_view(['GET'])
@permission_classes([CanViewPatient])
def patient_list(request):
    patients = Patient.objects.all()
    serializer = PatientSerializer(patients, many=True)
    return Response(serializer.data)