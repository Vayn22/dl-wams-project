from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from patients.models import Patient
from patients.permissions import CanAddPatient
from patients.serializers import PatientSerializer


@api_view(['POST'])
@permission_classes([CanAddPatient])
def patient_create(request):
    phone = request.data.get('phone_number')
    existing = Patient.objects.filter(phone_number=phone).first()

    if existing:
        return Response(
            {
                'detail': 'Un patient avec ce numero de telephone existe deja.'
            },
            status=status.HTTP_409_CONFLICT
        )

    serializer = PatientSerializer(data=request.data)
    if serializer.is_valid():
        patient = serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)