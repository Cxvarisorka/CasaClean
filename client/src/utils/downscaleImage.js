/*
 * downscaleImage
 * --------------
 * Reads a user-picked image File and returns a new JPEG File, resized so its
 * longest edge is at most `maxEdge`. The result is uploaded to the API as
 * multipart/form-data and stored in the server's uploads folder.
 *
 * Downscaling client-side keeps the upload small (typically well under a few
 * hundred KB instead of a multi-megabyte original), which matters because it
 * also bounds what the server has to accept and keep on disk.
 */

const DEFAULTS = { maxEdge: 1000, quality: 0.72, mimeType: "image/jpeg" };

const fail = (message, code) => Object.assign(new Error(message), { code });

export function downscaleImage(file, options = {}) {
  const { maxEdge, quality, mimeType } = { ...DEFAULTS, ...options };

  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      reject(fail("Please choose an image file.", "notImage"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(fail("Could not read the image file.", "readFailed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(fail("That image could not be loaded.", "loadFailed"));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // toBlob is async and hands back null when encoding fails.
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(fail("That image could not be processed.", "processFailed"));
              return;
            }
            // The server derives the stored extension from the MIME type and
            // ignores this name, but a sensible one keeps devtools readable.
            resolve(new File([blob], "cover.jpg", { type: mimeType }));
          },
          mimeType,
          quality
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default downscaleImage;
