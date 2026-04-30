# ai/views.py
import base64
import io

import numpy as np
from PIL import Image
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .inference import run_unet


@api_view(["POST"])
def segment(request):
    if "image" not in request.FILES:
        return Response({"error": "No image provided"}, status=400)

    file = request.FILES["image"]
    image = Image.open(file).convert("RGB")

    mask = run_unet(image)

    mask_img = Image.fromarray((mask * 255).astype(np.uint8))

    buffer = io.BytesIO()
    mask_img.save(buffer, format="PNG")

    encoded = base64.b64encode(buffer.getvalue()).decode()

    return Response({"mask": encoded})
