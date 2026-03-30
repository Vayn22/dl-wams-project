from rest_framework.views import APIView
from rest_framework.response import Response
from users.permissions import IsAdminOrDoctor


class DoctorView(APIView):
    permission_classes = [IsAdminOrDoctor]

    def get(self, request):
        return Response({
            'message': f'Hello Dr. {request.user.username}',
            'specialty': request.user.specialty.name if request.user.specialty else None,
            'role': request.user.role,
        })