export interface LearningFigure {
  id: string;
  prompt: string;
  context: string;
  caption: string;
  labels: string[];
}
export type LearningBlock = { type: "markdown"; text: string } | { type: "image"; figure: LearningFigure };
export interface LearningSection { id: string; title: string; blocks: LearningBlock[] }

/** Keep supplied prose verbatim; figure instructions become structured illustration data. */
export function parseLearningSource(source: string): LearningSection[] {
  const sections: LearningSection[] = [];
  const sectionPattern = /^## (.+)$/gm;
  const headings = [...source.matchAll(sectionPattern)];
  headings.forEach((heading, index) => {
    const title = heading[1] ?? "";
    const start = (heading.index ?? 0) + heading[0].length;
    const end = headings[index + 1]?.index ?? source.length;
    const text = source.slice(start, end);
    const blocks: LearningBlock[] = [];
    const figurePattern = /\[FIGURE_ID: ([^\]]+)\]\n((?:>.*(?:\n|$))+)/g;
    let cursor = 0;
    for (const match of text.matchAll(figurePattern)) {
      const before = text.slice(cursor, match.index).trim();
      if (before) blocks.push({ type: "markdown", text: before });
      const metadata = match[2] ?? "";
      const field = (name: string) => metadata.match(new RegExp(`\\*\\*${name}\\*\\*: (.+)`))?.[1]?.trim() ?? "";
      const labelText = metadata.split("**Transcribed Diagram Labels**:")[1]?.split("> - **Caption**:")[0] ?? "";
      const labels = [...labelText.matchAll(/^>\s+- (.+)$/gm)].map((m) => (m[1] ?? "").trim());
      if (labels.length === 0 && labelText.trim()) {
        labels.push(...labelText.replace(/^>\s*/gm, "").trim().split(/,\s*| (?=R L BOTH START PUSH)/));
      }
      blocks.push({ type: "image", figure: {
        id: match[1] ?? "", prompt: field("Image Generation Prompt"), context: field("Context"), caption: field("Caption"), labels,
      } });
      cursor = (match.index ?? 0) + match[0].length;
    }
    const after = text.slice(cursor).trim();
    if (after) blocks.push({ type: "markdown", text: after });
    sections.push({ id: `section-${index + 1}`, title, blocks });
  });
  return sections;
}