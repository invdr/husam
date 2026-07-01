/**
 * Ресайз и сжатие изображения перед загрузкой.
 * Макс. ширина 1920px, JPEG качество 0.82.
 * Не-изображения возвращаются как есть (Blob из File).
 * @param {File} file
 * @param {{ maxWidth?: number, jpegQuality?: number }} options
 * @returns {Promise<Blob>}
 */
export function resizeImage(file, options = {}) {
  const { maxWidth = 1920, jpegQuality = 0.82 } = options;

  if (!file.type.startsWith("image/")) {
    return Promise.resolve(file);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (w <= maxWidth && h <= maxWidth) {
        toJpegBlob(img, w, h, jpegQuality).then(resolve).catch(reject);
        return;
      }
      const scale = maxWidth / Math.max(w, h);
      const dw = Math.round(w * scale);
      const dh = Math.round(h * scale);
      toJpegBlob(img, dw, dh, jpegQuality).then(resolve).catch(reject);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

function toJpegBlob(img, width, height, quality) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas 2d not available"));
      return;
    }
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      quality
    );
  });
}
