import base64
import io
import json

from PIL import Image

# load response
with open("response.json", "r") as f:
    data = json.load(f)

# decode base64 mask
mask_bytes = base64.b64decode(data["mask"])

# convert to image
mask_image = Image.open(io.BytesIO(mask_bytes))

# save result
mask_image.save("result.png")

print("Saved as result.png")
