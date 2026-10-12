import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/**
 * Longest edge sent for analysis. Image cost scales with pixel area (about one token per 28×28
 * pixels), so 1092 px (about 1,100 tokens for a 4:3 photo) costs roughly half of 1568 px while
 * still showing a plate of food in plenty of detail. It also keeps uploads small and well under
 * the API's 5 MB per-image limit.
 */
const MAX_EDGE_PX = 1092;

export interface PreparedPhoto {
  uri: string;
  base64: string | null;
}

/** Shrinks a camera or library photo and re-encodes it as JPEG, ready to send for analysis. */
export async function preparePhotoForAnalysis(uri: string, width?: number, height?: number): Promise<PreparedPhoto> {
  const context = ImageManipulator.manipulate(uri);
  if (!width || !height) {
    context.resize({ width: MAX_EDGE_PX });
  } else if (Math.max(width, height) > MAX_EDGE_PX) {
    context.resize(width >= height ? { width: MAX_EDGE_PX } : { height: MAX_EDGE_PX });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  return { uri: result.uri, base64: result.base64 ?? null };
}
