from rest_framework.decorators import api_view
from rest_framework.response import Response
from users.decorators import any_role


@api_view(['GET'])
@any_role('admin')
def admin_only(request):
    return Response({'message': f'Hello admin {request.user.username}!'})