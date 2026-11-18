export function resizedDimensions(width: number, height: number, max = 1600) {
  if (width <= 0 || height <= 0 || max <= 0 || !Number.isFinite(width + height + max))
    throw new Error("画像サイズが不正です。");
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function resizePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 30 * 1024 * 1024)
    throw new Error("30MB以下の画像を選んでください。");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const size = resizedDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    Object.assign(canvas, size);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("画像を処理できませんでした。");
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    bitmap.close();
  }
}
