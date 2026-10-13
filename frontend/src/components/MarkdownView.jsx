import React from "react";

export function MarkdownView({ content = "" }) {
  if (!content) return null;

  // Split into paragraphs / blocks
  const lines = content.split("\n");
  const elements = [];
  let inTable = false;
  let tableRows = [];
  let inCodeBlock = false;
  let codeLines = [];

  const flushTable = (key) => {
    if (tableRows.length === 0) return null;
    const header = tableRows[0];
    const dataRows = tableRows.slice(1).filter((r) => !r.every((c) => c.match(/^[:\-\s]+$/)));
    const comp = (
      <div key={`tbl-${key}`} className="my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-muted text-foreground">
            <tr>
              {header.map((col, idx) => (
                <th key={idx} className="px-3 py-2 font-semibold">
                  {col.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rIdx) => (
              <tr key={rIdx} className="border-t border-border hover:bg-muted/40">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-foreground/90">
                    {formatInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
    return comp;
  };

  const flushCode = (key) => {
    const comp = (
      <pre key={`code-${key}`} className="my-3 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs text-foreground">
        {codeLines.join("\n")}
      </pre>
    );
    codeLines = [];
    inCodeBlock = false;
    return comp;
  };

  lines.forEach((line, idx) => {
    // Code block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(flushCode(idx));
      } else {
        if (inTable) elements.push(flushTable(idx));
        inCodeBlock = true;
      }
      return;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    // Markdown Table row
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      inTable = true;
      const cells = line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      tableRows.push(cells);
      return;
    } else if (inTable) {
      elements.push(flushTable(idx));
    }

    // Headers
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={idx} className="mt-5 mb-2 font-heading text-2xl font-bold tracking-tight text-foreground">
          {formatInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={idx} className="mt-4 mb-2 font-heading text-lg font-bold tracking-tight text-primary">
          {formatInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={idx} className="mt-3 mb-1.5 font-heading text-base font-semibold text-foreground">
          {formatInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={idx} className="ml-4 list-disc text-sm text-foreground/90">
          {formatInline(line.slice(2))}
        </li>
      );
    } else if (line.trim() === "---") {
      elements.push(<hr key={idx} className="my-4 border-border" />);
    } else if (line.trim()) {
      elements.push(
        <p key={idx} className="my-1.5 text-sm leading-relaxed text-foreground/90">
          {formatInline(line)}
        </p>
      );
    }
  });

  if (inTable) elements.push(flushTable("final"));
  if (inCodeBlock) elements.push(flushCode("final"));

  return <div className="space-y-1">{elements}</div>;
}

function formatInline(text) {
  if (!text) return "";
  // Split on bold **
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
