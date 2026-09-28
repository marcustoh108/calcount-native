import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/**
 * Longest edge sent for analysis. Claude reads food photos at about this size anyway, so larger
 * photos only add upload time and can exceed the API's 5 MB per-image limit (modern iPhone photos
 * often do).
 */
const MAX_EDGE_PX = 1568;

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
