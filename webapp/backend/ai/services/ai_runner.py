def run_ai_model(model, image):
    if model.code == "brain_model":
        return {
            "prediction": "Tumor detected",
            "confidence": 0.91
        }

    elif model.code == "xray_model":
        return {
            "prediction": "Normal",
            "confidence": 0.87
        }

    return {
        "prediction": "Unknown model",
        "confidence": 0.0
    }