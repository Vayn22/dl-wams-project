from rest_framework.decorators import api_view
from rest_framework.response import Response
from users.decorators import any_role


@api_view(['GET'])
@any_role('admin', 'doctor')
def doctor_view(request):
    return Response({
        'message': f'Hello Dr. {request.user.username}',
        'specialty': request.user.specialty.name if request.user.specialty else None,
        'role': request.user.role,
    })