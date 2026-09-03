export type HighlightedTextSegment = {
  text: string;
  highlighted: boolean;
};

const HIGHLIGHT_MARKER = "@@";
const HIGHLIGHT_PATTERN = /@@([\s\S]+?)@@/g;

export function parseHighlightMarkers(value: string): HighlightedTextSegment[] {
  const segments: HighlightedTextSegment[] = [];
  let cursor = 0;

  for (const match of value.matchAll(HIGHLIGHT_PATTERN)) {
    const matchIndex = match.index;

    if (matchIndex > cursor) {
      segments.push({
        text: value.slice(cursor, matchIndex),
        highlighted: false,
      });
    }

    segments.push({
      text: match[1] ?? "",
      highlighted: true,
    });
    cursor = matchIndex + match[0].length;
  }

  if (cursor < value.length || segments.length === 0) {
    segments.push({
      text: value.slice(cursor),
      highlighted: false,
    });
  }

  return segments;
}

export function stripHighlightMarkers(value: string) {
  return parseHighlightMarkers(value)
    .map((segment) => segment.text)
    .join("")
    .replaceAll(HIGHLIGHT_MARKER, "");
}
