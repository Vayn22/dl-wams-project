from rest_framework.views import APIView
from rest_framework.response import Response
from patients.models import Patient
from patients.serializers import PatientSerializer
from users.permissions import IsAdminOrDoctor


class PatientListView(APIView):
    permission_classes = [IsAdminOrDoctor]

    def get(self, request):
        if request.user.role == 'admin':
            patients = Patient.objects.all()
        else:
            patients = Patient.objects.filter(doctors=request.user)
        serializer = PatientSerializer(patients, many=True)
        return Response(serializer.data)