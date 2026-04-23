from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models import Specialty


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def specialties_list(request):
    specialties = Specialty.objects.all().values("id", "name")
    return Response(list(specialties))
