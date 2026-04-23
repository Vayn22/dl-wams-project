import onnxruntime as ort
import numpy as np
from PIL import Image
import io
import base64


# 🔥 Load model (lazy load per request for now)
def load_model():
    return ort.InferenceSession("ai/models_files/seg_model_UNet-EffB0.onnx")


def preprocess(image_file):
    img = Image.open(image_file).convert("RGB")
    img = img.resize((224, 224))
    img_array = np.array(img).astype(np.float32) / 255.0
    img_array = np.transpose(img_array, (2, 0, 1))
    img_array = np.expand_dims(img_array, axis=0)
    return img_array  # don't return img separately, just the array


def postprocess(output, original_pil_image):
    raw = output[0][0][0]
    mask = 1 / (1 + np.exp(-raw))

    print("MASK min:", mask.min(), "max:", mask.max(), "mean:", mask.mean())

    # Normalize mask to 0-255 for visualization
    mask_norm = ((mask - mask.min()) / (mask.max() - mask.min()) * 255).astype(np.uint8)

    # Apply red heatmap proportionally (no threshold)
    img = np.array(original_pil_image).astype(np.float32)
    heat = mask_norm.astype(np.float32) / 255.0  # 0 to 1

    overlay = img.copy()
    overlay[..., 0] = np.clip(img[..., 0] + heat * 200, 0, 255)  # boost red
    overlay[..., 1] = np.clip(img[..., 1] * (1 - heat * 0.5), 0, 255)  # suppress green
    overlay[..., 2] = np.clip(img[..., 2] * (1 - heat * 0.5), 0, 255)  # suppress blue

    overlay_img = Image.fromarray(overlay.astype(np.uint8))
    buffer = io.BytesIO()
    overlay_img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")

def run_segmentation_model(image_file):
    try:
        session = load_model()
        input_name = session.get_inputs()[0].name

        # Print model input/output info
        print("=== MODEL INFO ===")
        for inp in session.get_inputs():
            print(f"Input: {inp.name}, shape: {inp.shape}, type: {inp.type}")
        for out in session.get_outputs():
            print(f"Output: {out.name}, shape: {out.shape}, type: {out.type}")

        image_file.seek(0)
        pil_image = Image.open(image_file).convert("RGB").resize((224, 224))

        img_array = np.array(pil_image).astype(np.float32) / 255.0
        img_array = np.transpose(img_array, (2, 0, 1))
        img_array = np.expand_dims(img_array, axis=0)

        outputs = session.run(None, {input_name: img_array})

        print("=== RAW OUTPUTS ===")
        print(f"Number of output tensors: {len(outputs)}")
        for i, o in enumerate(outputs):
            print(f"outputs[{i}] shape: {o.shape}, dtype: {o.dtype}")
            print(f"  min={o.min():.6f}, max={o.max():.6f}, mean={o.mean():.6f}")
            # Print unique values if small range
            flat = o.flatten()
            print(f"  first 10 values: {flat[:10]}")

        result_image = postprocess(outputs, pil_image)
        return {"type": "segmentation", "image": result_image}

    except Exception as e:
        import traceback
        print("AI ERROR:", traceback.format_exc())
        return {"error": str(e)}

# 🔹 Main dispatcher
def run_ai_model(model, image):
    if model.code == "brain_model":
        return run_segmentation_model(image)

    return {"error": "Unknown model"}