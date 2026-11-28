export type DiffLine = { kind: "unchanged" | "removed" | "added"; text: string };

export function diffLines(before: string, after: string): DiffLine[] {
  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  let start = 0;
  while (start < oldLines.length && oldLines[start] === newLines[start]) start++;

  let oldEnd = oldLines.length;
  let newEnd = newLines.length;
  while (oldEnd > start && newEnd > start && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  const result: DiffLine[] = oldLines.slice(0, start).map((text) => ({ kind: "unchanged", text }));
  const rows = oldEnd - start + 1;
  const cols = newEnd - start + 1;

  // Bound work for large pasted reports. The changed block still shows every line.
  if (rows * cols > 1_000_000) {
    for (const text of oldLines.slice(start, oldEnd)) result.push({ kind: "removed", text });
    for (const text of newLines.slice(start, newEnd)) result.push({ kind: "added", text });
  } else {
    const matches = new Uint32Array(rows * cols);
    for (let row = rows - 2; row >= 0; row--) {
      for (let col = cols - 2; col >= 0; col--) {
        const index = row * cols + col;
        matches[index] = oldLines[start + row] === newLines[start + col]
          ? 1 + matches[index + cols + 1]
          : Math.max(matches[index + cols], matches[index + 1]);
      }
    }

    let row = 0;
    let col = 0;
    while (row < rows - 1 || col < cols - 1) {
      if (row < rows - 1 && col < cols - 1 && oldLines[start + row] === newLines[start + col]) {
        result.push({ kind: "unchanged", text: oldLines[start + row] });
        row++;
        col++;
      } else if (row < rows - 1 && (col === cols - 1 || matches[(row + 1) * cols + col] >= matches[row * cols + col + 1])) {
        result.push({ kind: "removed", text: oldLines[start + row] });
        row++;
      } else {
        result.push({ kind: "added", text: newLines[start + col] });
        col++;
      }
    }
  }
  for (const text of oldLines.slice(oldEnd)) result.push({ kind: "unchanged", text });
  return result;
}
