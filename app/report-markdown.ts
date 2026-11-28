const titlePattern = /^ {0,3}#[ \t]+(.+)$/m;

export function reportTitle(markdown: string) {
  const title = markdown.match(titlePattern)?.[1];
  return (title ?? markdown.split(/\r?\n/).find((line) => line.trim()))?.trim() || "Untitled draft";
}

export function reportBody(markdown: string) {
  return markdown.replace(titlePattern, "").trim();
}

export const reportFields = [
  { label: "Observed behavior", headings: /^observed behavior$/i },
  { label: "Reproduction steps", headings: /^(?:known )?reproduction steps$|^steps to reproduce$/i },
  { label: "Expected behavior", headings: /^expected behavior$/i },
];

export function reportSections(markdown: string) {
  const headings: { title: string; start: number; content: number; level: number }[] = [];
  let offset = 0;
  let fence: string | undefined;
  for (const line of markdown.split("\n")) {
    const codeFence = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (codeFence && !fence) {
      fence = codeFence[1];
    } else if (codeFence && fence && codeFence[1].startsWith(fence) && !line.slice(codeFence[0].length).trim()) {
      fence = undefined;
    } else if (!fence) {
      const heading = line.match(/^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$/);
      if (heading) headings.push({ title: heading[2], start: offset, content: offset + line.length + 1, level: heading[1].length });
    }
    offset += line.length + 1;
  }

  return reportFields.map(({ label, headings: pattern }) => {
    const index = headings.findIndex(({ title }) => pattern.test(title));
    if (index < 0) return { label, present: false, range: null };
    const heading = headings[index];
    const start = Math.min(heading.content, markdown.length);
    const end = headings.slice(index + 1).find(({ level }) => level <= heading.level)?.start ?? markdown.length;
    const body = markdown.slice(start, end);
    const content = body.trim().replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, "").replace(/^[*_]+/, "");
    return { label, present: Boolean(content) && !/^unknown\b/i.test(content), range: { start, end } };
  });
}
