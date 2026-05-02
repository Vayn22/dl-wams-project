from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import Patient
from ..permissions import CanViewPatient
from ..serializers import PatientSerializer


@api_view(["GET"])
@permission_classes([CanViewPatient])
def patient_list(request):
    patients = Patient.objects.all().order_by("-id")
    return Response(PatientSerializer(patients, many=True).data)
