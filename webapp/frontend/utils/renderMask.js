function normalizeColor(color) {
  const match = String(color || "").match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-1]?\.?\d+))?\s*\)$/i
  );
  if (!match) {
    return { r: 255, g: 0, b: 0, a: 0.4 };
  }
  return {
    r: Math.min(255, Number(match[1])),
    g: Math.min(255, Number(match[2])),
    b: Math.min(255, Number(match[3])),
    a: match[4] == null ? 1 : Math.max(0, Math.min(1, Number(match[4]))),
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de charger le masque IA."));
    image.src = src;
  });
}

export async function drawMaskOnCanvas(
  canvas,
  originalImage,
  maskBase64,
  overlayColor = "rgba(255, 0, 0, 0.4)"
) {
  if (!canvas || !originalImage || !maskBase64) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  if (!width || !height) return;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, width, height);

  ctx.drawImage(
    originalImage,
    0,
    0,
    originalImage.naturalWidth || originalImage.width,
    originalImage.naturalHeight || originalImage.height,
    0,
    0,
    width,
    height
  );

  const imageSource = maskBase64.startsWith("data:")
    ? maskBase64
    : `data:image/png;base64,${maskBase64}`;
  const maskImage = await loadImage(imageSource);

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) {
    ctx.restore();
    return;
  }
  maskCtx.drawImage(maskImage, 0, 0, width, height);
  const maskData = maskCtx.getImageData(0, 0, width, height);

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = width;
  colorCanvas.height = height;
  const colorCtx = colorCanvas.getContext("2d");
  if (!colorCtx) {
    ctx.restore();
    return;
  }

  const colorData = colorCtx.createImageData(width, height);
  const rgba = normalizeColor(overlayColor);

  for (let i = 0; i < maskData.data.length; i += 4) {
    const maskPixel = maskData.data[i];
    if (maskPixel > 0) {
      colorData.data[i] = rgba.r;
      colorData.data[i + 1] = rgba.g;
      colorData.data[i + 2] = rgba.b;
      colorData.data[i + 3] = Math.round(maskPixel * rgba.a);
    }
  }

  colorCtx.putImageData(colorData, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(colorCanvas, 0, 0);
  ctx.restore();
}
