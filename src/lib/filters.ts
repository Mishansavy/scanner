export function applyGrayscale(image: ImageData) {
  const pixels = image.data;
  for (let index = 0; index < pixels.length; index += 4) {
    const luminance =
      0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];
    pixels[index] = pixels[index + 1] = pixels[index + 2] = luminance;
  }
}

// Adaptive threshold (Bradley) using an integral image
export function applyDocumentThreshold(image: ImageData, sensitivity = 0.15) {
  applyGrayscale(image);
  const { width, height, data: pixels } = image;
  const radius = Math.max(8, Math.floor(Math.max(width, height) / 32));
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += pixels[(y * width + x) * 4];
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + rowSum;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - radius);
      const right = Math.min(width, x + radius + 1);
      const top = Math.max(0, y - radius);
      const bottom = Math.min(height, y + radius + 1);

      const areaSum =
        integral[bottom * stride + right] -
        integral[top * stride + right] -
        integral[bottom * stride + left] +
        integral[top * stride + left];
      const localMean = areaSum / ((right - left) * (bottom - top));

      const pixelIndex = (y * width + x) * 4;
      const value = pixels[pixelIndex] < localMean * (1 - sensitivity) ? 0 : 255;
      pixels[pixelIndex] = pixels[pixelIndex + 1] = pixels[pixelIndex + 2] = value;
    }
  }
}