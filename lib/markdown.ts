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
  // CommonMark treats CJK text immediately following a closing emphasis
  // marker as part of the same word. Add a non-breaking space so
  // `**结论：**目前` is parsed as bold text instead of literal asterisks.
  return normalized.replace(/(\*\*[^*\n]+?\*\*)(?=[\u3400-\u9fff\uf900-\ufaff])/g, "$1\u00a0");
}
