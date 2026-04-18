from rest_framework.decorators import api_view
from rest_framework.response import Response
from users.models import User
from django.contrib.auth.models import Group
from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes


@api_view(['POST'])
@permission_classes([AllowAny])
def dev_create_user(request):
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response({"error": "username and password required"}, status=400)

    user = User.objects.create_user(username=username, password=password)

    # add to Admin group
    group, _ = Group.objects.get_or_create(name="Admin")
    user.groups.add(group)

    return Response({"message": "User created"})