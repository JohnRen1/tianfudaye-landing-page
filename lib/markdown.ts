/**
 * Normalize model Markdown before it reaches ReactMarkdown.
 *
 * Some OpenAI-compatible models occasionally escape emphasis markers as
 * `\*\*标题\*\*`. ReactMarkdown correctly treats those markers as literal text,
 * so the customer would see the asterisks. We only undo the formatting escapes
 * we explicitly support and hide an unmatched streaming marker until its pair
 * arrives.
 */
export function normalizeMarkdownForRender(content: string): string {
  let normalized = content.replace(/\\\*\\\*/g, "**").replace(/\\_\\_/g, "__");
  const markerCount = (normalized.match(/\*\*/g) ?? []).length;
  if (markerCount % 2 === 1) {
    const lastMarker = normalized.lastIndexOf("**");
    normalized = `${normalized.slice(0, lastMarker)}${normalized.slice(lastMarker + 2)}`;
  }
  // CommonMark's left/right-flanking rules can reject strong emphasis when
  // Chinese text touches either side of the marker. Treat markers by their
  // position in each pair, rather than matching from one marker to another:
  // a closing marker is also preceded by CJK text, so a broad span regex can
  // accidentally add whitespace *inside* the emphasis span.
  let markerIndex = 0;
  return normalized.replace(/\*\*/g, (marker, offset, source) => {
    const isOpening = markerIndex % 2 === 0;
    markerIndex += 1;
    const previous = source[offset - 1];
    const next = source[offset + marker.length];
    const before = isOpening && isCjk(previous) ? "\u00a0" : "";
    const after = !isOpening && isCjk(next) ? "\u00a0" : "";
    return `${before}${marker}${after}`;
  });
}

function isCjk(character: string | undefined): boolean {
  return character !== undefined && /[\u3400-\u9fff\uf900-\ufaff]/.test(character);
}
