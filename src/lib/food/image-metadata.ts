import type { FoodImageMimeType } from "@/lib/food/contracts";

const MAX_EXIF_BYTES = 512 * 1024;
const CHINA_TIME_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1_000;

function ascii(view: DataView, offset: number, length: number) {
  let result = "";
  for (let index = 0; index < length && offset + index < view.byteLength; index += 1) {
    result += String.fromCharCode(view.getUint8(offset + index));
  }
  return result;
}

function readTiffDate(view: DataView, tiffOffset: number) {
  if (tiffOffset + 8 > view.byteLength) return null;
  const endian = ascii(view, tiffOffset, 2);
  const littleEndian = endian === "II";
  if (!littleEndian && endian !== "MM") return null;
  if (view.getUint16(tiffOffset + 2, littleEndian) !== 42) return null;

  const readIfd = (relativeOffset: number) => {
    const offset = tiffOffset + relativeOffset;
    if (offset < tiffOffset || offset + 2 > view.byteLength) return [];
    const entries = view.getUint16(offset, littleEndian);
    const result: Array<{ tag: number; type: number; count: number; valueOffset: number }> = [];
    for (let index = 0; index < entries; index += 1) {
      const entryOffset = offset + 2 + index * 12;
      if (entryOffset + 12 > view.byteLength) break;
      result.push({
        tag: view.getUint16(entryOffset, littleEndian),
        type: view.getUint16(entryOffset + 2, littleEndian),
        count: view.getUint32(entryOffset + 4, littleEndian),
        valueOffset: view.getUint32(entryOffset + 8, littleEndian),
      });
    }
    return result;
  };

  const readAsciiEntry = (entry: { type: number; count: number; valueOffset: number }) => {
    if (entry.type !== 2 || entry.count < 10 || entry.count > 64) return null;
    const offset = entry.count <= 4 ? entry.valueOffset : tiffOffset + entry.valueOffset;
    if (offset < tiffOffset || offset + entry.count > view.byteLength) return null;
    return ascii(view, offset, entry.count).replace(/\0.*$/u, "").trim();
  };

  const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);
  const firstIfd = readIfd(firstIfdOffset);
  const exifPointer = firstIfd.find((entry) => entry.tag === 0x8769);
  const exifIfd = exifPointer ? readIfd(exifPointer.valueOffset) : [];
  const dateEntry = exifIfd.find((entry) => entry.tag === 0x9003 || entry.tag === 0x9004)
    ?? firstIfd.find((entry) => entry.tag === 0x0132);
  return dateEntry ? readAsciiEntry(dateEntry) : null;
}

function exifDateFromBuffer(buffer: ArrayBuffer, mimeType: string) {
  const view = new DataView(buffer);

  if (mimeType === "image/jpeg" && view.byteLength >= 4 && view.getUint16(0) === 0xffd8) {
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      if (marker === 0xda || marker === 0xd9) break;
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + 2 + length > view.byteLength) break;
      if (marker === 0xe1 && ascii(view, offset + 4, 6) === "Exif\0\0") {
        return readTiffDate(view, offset + 10);
      }
      offset += 2 + length;
    }
  }

  if (mimeType === "image/webp" && ascii(view, 0, 4) === "RIFF" && ascii(view, 8, 4) === "WEBP") {
    let offset = 12;
    while (offset + 8 <= view.byteLength) {
      const chunk = ascii(view, offset, 4);
      const length = view.getUint32(offset + 4, true);
      if (chunk === "EXIF") {
        const start = ascii(view, offset + 8, 6) === "Exif\0\0" ? offset + 14 : offset + 8;
        return readTiffDate(view, start);
      }
      offset += 8 + length + (length % 2);
    }
  }

  if (mimeType === "image/png" && view.byteLength >= 24 && view.getUint32(0) === 0x89504e47) {
    let offset = 8;
    while (offset + 12 <= view.byteLength) {
      const length = view.getUint32(offset);
      const chunk = ascii(view, offset + 4, 4);
      if (chunk === "eXIf") return readTiffDate(view, offset + 8);
      offset += 12 + length;
    }
  }

  return null;
}

function parseExifLocalDate(value: string | null) {
  if (!value) return undefined;
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/u);
  if (!match) return undefined;
  const [, year, month, day, hours, minutes, seconds = "00"] = match;
  return chinaLocalPartsToIso(
    Number(year),
    Number(month),
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds),
  );
}

function chinaLocalPartsToIso(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds = 0,
) {
  const utcMilliseconds = Date.UTC(year, month - 1, day, hours, minutes, seconds)
    - CHINA_TIME_OFFSET_MILLISECONDS;
  const chinaWallClock = new Date(utcMilliseconds + CHINA_TIME_OFFSET_MILLISECONDS);
  if (
    chinaWallClock.getUTCFullYear() !== year
    || chinaWallClock.getUTCMonth() !== month - 1
    || chinaWallClock.getUTCDate() !== day
    || chinaWallClock.getUTCHours() !== hours
    || chinaWallClock.getUTCMinutes() !== minutes
    || chinaWallClock.getUTCSeconds() !== seconds
  ) {
    return undefined;
  }
  return new Date(utcMilliseconds).toISOString();
}

function imageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法读取图片尺寸。"));
    };
    image.src = url;
  });
}

export async function inspectFoodImage(file: File) {
  if (!(["image/jpeg", "image/png", "image/webp"] as string[]).includes(file.type)) {
    throw new Error("只支持 JPEG、PNG 和 WebP 图片。");
  }
  const dimensions = await imageDimensions(file);
  const buffer = await file.slice(0, MAX_EXIF_BYTES).arrayBuffer();
  return {
    ...dimensions,
    mimeType: file.type as FoodImageMimeType,
    byteSize: file.size,
    capturedAt: parseExifLocalDate(exifDateFromBuffer(buffer, file.type)),
  };
}

export function toDateTimeLocalValue(value: string | number = Date.now()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + CHINA_TIME_OFFSET_MILLISECONDS).toISOString().slice(0, 16);
}

export function chinaDateTimeLocalToIso(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u);
  if (!match) return undefined;
  const [, year, month, day, hours, minutes] = match;
  return chinaLocalPartsToIso(
    Number(year),
    Number(month),
    Number(day),
    Number(hours),
    Number(minutes),
  );
}
