export function compareRuns(baseline: string, failing: string) {
  const before = baseline.split("\n");
  const after = failing.split("\n");
  const total = Math.max(before.length, after.length);
  let first = 0;
  while (first < total && before[first] === after[first]) first++;
  if (first === total) return null;

  const start = Math.max(0, first - 2);
  const end = Math.min(total, first + 3);
  const rows = Array.from({ length: end - start }, (_, index) => {
    const offset = start + index;
    return { number: offset + 1, baseline: before[offset], failing: after[offset], changed: offset === first };
  });
  return { firstLine: first + 1, rows };
}

export function comparisonPrompt(comparison: ReturnType<typeof compareRuns>) {
  if (!comparison) return "Baseline comparison: the redacted runs are identical.";
  return [
    `Baseline comparison (first change at line ${comparison.firstLine}; nearby redacted lines):`,
    ...comparison.rows.flatMap(({ number, baseline, failing }) => [
      `Baseline line ${number}: ${baseline ?? "(no line)"}`,
      `Failing line ${number}: ${failing ?? "(no line)"}`,
    ]),
  ].join("\n");
}

export function RunComparison({ comparison }: { comparison: ReturnType<typeof compareRuns> }) {
  if (!comparison) return <p>No differences between the redacted runs.</p>;
  return (
    <div className="flow compact">
      <p>First change at line {comparison.firstLine}</p>
      <div className="comparison-scroll" tabIndex={0} role="region" aria-label="Baseline and failing log comparison">
        <table className="comparison-table">
          <thead><tr><th scope="col">Line</th><th scope="col">Baseline</th><th scope="col">Failing</th></tr></thead>
          <tbody>
            {comparison.rows.map((line) => (
              <tr className={line.changed ? "first-change" : undefined} key={line.number}>
                <th scope="row">{line.number}{line.changed && <span> · First change</span>}</th>
                <td><code>{line.baseline ?? "—"}</code></td>
                <td><code>{line.failing ?? "—"}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
