# ai/inference.py

import cv2
import numpy as np
from PIL import Image

from .model import input_name, output_name, session

# ===== FROM TRAINING =====
IMG_SIZE = 224
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


# =============================
# PREPROCESS (RGB ONLY)
# =============================
def preprocess(image: Image.Image):
    # PIL → numpy (RGB)
    img = np.array(image)

    # resize to training size
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))

    # scale to [0,1]
    img = img.astype(np.float32) / 255.0

    # normalize (same as Albumentations)
    img = (img - MEAN) / STD

    # HWC → CHW
    img = np.transpose(img, (2, 0, 1))

    # add batch dimension → (1,3,224,224)
    img = np.expand_dims(img, axis=0).astype(np.float32)

    return img


# =============================
# POSTPROCESS
# =============================
def postprocess(output):
    logits = output[0]  # (1,1,H,W)
    logits = logits[0, 0]  # (H,W)

    # sigmoid (because activation=None in training)
    probs = 1 / (1 + np.exp(-logits))

    # threshold
    mask = (probs > 0.5).astype(np.uint8)

    return mask


# =============================
# MAIN FUNCTION
# =============================
def run_unet(image: Image.Image):
    x = preprocess(image)
    y = session.run([output_name], {input_name: x})
    mask = postprocess(y)
    return mask


print(session.get_inputs()[0].shape)
print(session.get_outputs()[0].shape)
