from rest_framework.views import APIView
from rest_framework.response import Response
from users.permissions import IsAdmin


class AdminOnlyView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response({'message': f'Hello admin {request.user.username}!'})