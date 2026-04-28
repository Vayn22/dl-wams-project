from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Specialty
from ..serializers import SpecialtySerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def specialties_list(request):
    specialties = Specialty.objects.all().order_by("name")
    return Response(SpecialtySerializer(specialties, many=True).data)
