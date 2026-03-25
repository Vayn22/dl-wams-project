from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


from rest_framework.views import APIView
from rest_framework.response import Response
from .permissions import IsAdmin, IsAdminOrMember


class AdminOnlyView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response({'message': f'Hello admin {request.user.username}!'})


class MemberView(APIView):
    permission_classes = [IsAdminOrMember]

    def get(self, request):
        return Response({'message': f'Hello {request.user.username}, your role is {request.user.role}!'})