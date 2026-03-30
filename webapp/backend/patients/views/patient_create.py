from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from patients.models import Patient
from patients.serializers import PatientSerializer
from users.permissions import IsAdminOrDoctor


class PatientCreateView(APIView):
    permission_classes = [IsAdminOrDoctor]

    def post(self, request):
        phone = request.data.get('phone_number')
        existing = Patient.objects.filter(phone_number=phone).first()

        if existing:
            existing.doctors.add(request.user)
            serializer = PatientSerializer(existing)
            return Response(
                {
                    'detail': 'Patient already exists. You have been linked to this patient.',
                    'patient': serializer.data
                },
                status=status.HTTP_200_OK
            )

        serializer = PatientSerializer(data=request.data)
        if serializer.is_valid():
            patient = serializer.save()
            if request.user.role == 'doctor':
                patient.doctors.add(request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)