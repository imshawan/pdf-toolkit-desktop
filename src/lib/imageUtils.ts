
/**
 * Rasterize text to a high-res transparent PNG to guarantee absolute 1:1 parity between browser kerning/fonts and the PDF.
 * @param text Text to rasterize
 * @param fontFamily Font family
 * @param color Text color
 * @returns Data URL of the rasterized text
 */
export function rasterizeTextToDataURL (text: string, fontFamily: string, color: string) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  
  // Use a very high base font size to ensure crisp PDF rendering
  const fontSize = 300;
  ctx.font = `${fontSize}px "${fontFamily}"`;
  
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) + 10;
  const height = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + 10;
  
  // If the text is empty or measuring failed, return empty transparent pixel
  if (width <= 10 || height <= 10) return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  canvas.width = width;
  canvas.height = height;
  
  // Re-apply font since changing canvas dimensions resets context
  ctx.font = `${fontSize}px "${fontFamily}"`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  
  // Draw text perfectly aligned using alphabetic baseline
  ctx.fillText(text, Math.ceil(metrics.actualBoundingBoxLeft) + 5, Math.ceil(metrics.actualBoundingBoxAscent) + 5);
  
  return canvas.toDataURL('image/png');
};