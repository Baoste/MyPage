export function imageSignatureMatches(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") {
    return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value);
  }
  return bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export function imageDimensionsFromBytes(bytes: Uint8Array, mimeType: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (mimeType === "image/png") {
    if (
      bytes.length < 24
      || String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR"
    ) return null;
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  if (mimeType === "image/jpeg") {
    const startOfFrameMarkers = new Set([
      0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
    ]);
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset];
      offset += 1;
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) return null;
      const segmentLength = view.getUint16(offset);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
      if (startOfFrameMarkers.has(marker)) {
        if (segmentLength < 7) return null;
        return {
          height: view.getUint16(offset + 3),
          width: view.getUint16(offset + 5),
        };
      }
      offset += segmentLength;
    }
    return null;
  }

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const chunkLength = view.getUint32(offset + 4, true);
    const payload = offset + 8;
    if (payload + chunkLength > bytes.length) return null;
    if (chunkType === "VP8 " && chunkLength >= 10) {
      if (bytes[payload + 3] !== 0x9d || bytes[payload + 4] !== 0x01 || bytes[payload + 5] !== 0x2a) {
        return null;
      }
      return {
        width: view.getUint16(payload + 6, true) & 0x3fff,
        height: view.getUint16(payload + 8, true) & 0x3fff,
      };
    }
    if (chunkType === "VP8L" && chunkLength >= 5) {
      if (bytes[payload] !== 0x2f) return null;
      const dimensions = view.getUint32(payload + 1, true);
      return {
        width: (dimensions & 0x3fff) + 1,
        height: ((dimensions >>> 14) & 0x3fff) + 1,
      };
    }
    if (chunkType === "VP8X" && chunkLength >= 10) {
      const width = bytes[payload + 4]
        | (bytes[payload + 5] << 8)
        | (bytes[payload + 6] << 16);
      const height = bytes[payload + 7]
        | (bytes[payload + 8] << 8)
        | (bytes[payload + 9] << 16);
      return { width: width + 1, height: height + 1 };
    }
    offset += 8 + chunkLength + (chunkLength % 2);
  }
  return null;
}
