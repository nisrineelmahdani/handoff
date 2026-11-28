import type { Element, Root } from "hast";

export type EvidenceLine = { number: number; start: number; text: string };

export function logEvidence(logs: string) {
  const evidence = new Map<string, EvidenceLine[]>();
  let start = 0;
  for (const [index, text] of logs.split("\n").entries()) {
    const request = text.match(/\b(?:GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS|CONNECT|TRACE)[ \t]+(\/[^\s"'<>]*)(?:[ \t]+(?:(?:→|->|HTTP\/\d(?:\.\d)?)[ \t]+)?([1-5]\d{2})\b)?/i);
    const status = request?.[2] ?? text.match(/\b(?:HTTP\/\d(?:\.\d)?[ \t]+|status(?:Code)?[ \t]*[=:][ \t]*)([1-5]\d{2})\b/i)?.[1];
    for (const token of new Set([request?.[1], status])) {
      if (!token) continue;
      const line = { number: index + 1, start, text };
      const matches = evidence.get(token);
      if (matches) matches.push(line);
      else evidence.set(token, [line]);
    }
    start += text.length + 1;
  }
  return evidence;
}

export function linkLogEvidence(evidence: Map<string, EvidenceLine[]>) {
  return () => (tree: Root) => {
    function visit(parent: Root | Element) {
      parent.children = parent.children.flatMap((node): typeof parent.children => {
        if (node.type === "element" && !["a", "button", "pre"].includes(node.tagName)) visit(node);
        if (node.type !== "text") return [node];

        const result: typeof parent.children = [];
        let end = 0;
        for (const match of node.value.matchAll(/\/[a-zA-Z0-9_~%][a-zA-Z0-9_~%/.:?&=+@#-]*|\b[1-5]\d{2}\b/g)) {
          const token = evidence.has(match[0]) ? match[0] : match[0].replace(/[.?:]+$/, "");
          if (!evidence.has(token)) continue;
          if (match.index && match.index > end) result.push({ type: "text", value: node.value.slice(end, match.index) });
          result.push({
            type: "element",
            tagName: "button",
            properties: { type: "button", dataEvidence: token },
            children: [{ type: "text", value: token }],
          });
          end = (match.index ?? 0) + token.length;
        }
        if (end < node.value.length) result.push({ type: "text", value: node.value.slice(end) });
        return result;
      });
    }

    visit(tree);
  };
}
