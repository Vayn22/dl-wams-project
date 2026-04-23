from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from ai.models import AIModel
from ai.permissions import CanRunAIModel
from ai.services.ai_runner import run_ai_model


@api_view(["POST"])
@permission_classes([CanRunAIModel])
def ai_run(request):
    model_id = request.data.get("model_id")
    image = request.FILES.get("image")

    if not model_id or not image:
        return Response({"error": "model_id and image required"}, status=400)

    try:
        model = AIModel.objects.get(id=model_id)
    except AIModel.DoesNotExist:
        return Response({"error": "Model not found"}, status=404)

    result = run_ai_model(model, image)

    return Response({"model": model.name, "result": result})
