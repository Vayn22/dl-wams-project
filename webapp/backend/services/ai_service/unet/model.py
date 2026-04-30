# ai/model.py
import os

import onnxruntime as ort

MODEL_PATH = os.path.join(os.path.dirname(__file__), "seg_model_UNet-EffB0.onnx")

session = ort.InferenceSession(MODEL_PATH)

input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name
