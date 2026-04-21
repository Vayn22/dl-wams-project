from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from ai.models import AIModel
from ai.serializers import AIModelSerializer
from ai.permissions import CanViewAIModel


@api_view(['GET'])
@permission_classes([CanViewAIModel])
def ai_model_list(request):
    user = request.user

    if user.is_superuser:
        models = AIModel.objects.all()
    else:
        models = AIModel.objects.filter(
            specialties=user.specialty
        )

    serializer = AIModelSerializer(models, many=True)
    return Response(serializer.data)