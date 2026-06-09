/*
 * downscaleImage
 * --------------
 * Reads a user-picked image File and returns a compact JPEG data URL, resized so
 * its longest edge is at most `maxEdge`. Image handling is visual-only for now —
 * there's no file store — so the result is persisted inline on the service
 * document. Downscaling client-side keeps that payload small (typically well
 * under a few hundred KB) instead of shipping a multi-megabyte original.
 */

const DEFAULTS = { maxEdge: 1000, quality: 0.72, mimeType: "image/jpeg" };

export function downscaleImage(file, options = {}) {
  const { maxEdge, quality, mimeType } = { ...DEFAULTS, ...options };

  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That image could not be loaded."));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL(mimeType, quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default downscaleImage;
