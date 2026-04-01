from rest_framework.decorators import api_view
from rest_framework.response import Response
from patients.models import Patient
from patients.serializers import PatientSerializer
from users.decorators import any_role


@api_view(['GET'])
@any_role('admin', 'doctor')
def patient_list(request):
    if request.user.role == 'admin':
        patients = Patient.objects.all()
    else:
        patients = Patient.objects.filter(doctors=request.user)
    serializer = PatientSerializer(patients, many=True)
    return Response(serializer.data)
