import type { ReactNode } from "react";

function formatInline(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  const nodes: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part === "") return;
    if (i % 2 === 1) {
      nodes.push(
        <strong key={i} className="font-semibold text-zinc-100">
          {part}
        </strong>,
      );
    } else {
      nodes.push(part);
    }
  });
  return <>{nodes}</>;
}

function renderBodyBlock(block: string, key: string): ReactNode {
  const lines = block.split("\n");
  const nonEmpty = lines.map((l) => l.trimEnd()).filter((l) => l.length > 0);
  if (
    nonEmpty.length > 0 &&
    nonEmpty.every((l) => l.startsWith("- "))
  ) {
    return (
      <ul key={key} className="list-disc pl-5 space-y-2 text-sm text-zinc-300 leading-relaxed">
        {nonEmpty.map((l, i) => (
          <li key={`${key}-${i}`}>{formatInline(l.slice(2).trim())}</li>
        ))}
      </ul>
    );
  }
  return (
    <p key={key} className="text-sm text-zinc-300 leading-relaxed">
      {formatInline(block.trim())}
    </p>
  );
}

export function helpMarkdownToReact(md: string): ReactNode {
  const trimmed = md.trim();
  const withoutH1 = trimmed.replace(/^#[^\n]+\n+/, "").trim();
  const parts = withoutH1.split(/\n(?=## )/);
  const out: ReactNode[] = [];
  parts.forEach((part, idx) => {
    const p = part.trim();
    if (!p) return;
    if (p.startsWith("## ")) {
      const nl = p.indexOf("\n");
      const titleLine = nl === -1 ? p : p.slice(0, nl);
      const body = (nl === -1 ? "" : p.slice(nl + 1)).trim();
      const title = titleLine.replace(/^##\s+/, "").trim();
      const blocks = body.split(/\n\n+/).filter((b) => b.trim().length > 0);
      out.push(
        <section key={`s-${idx}`} className="space-y-3">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {blocks.map((b, bi) => renderBodyBlock(b.trim(), `s-${idx}-b-${bi}`))}
        </section>,
      );
    } else {
      const blocks = p.split(/\n\n+/).filter((b) => b.trim().length > 0);
      out.push(
        <div key={`p-${idx}`} className="space-y-3">
          {blocks.map((b, bi) => renderBodyBlock(b.trim(), `p-${idx}-b-${bi}`))}
        </div>,
      );
    }
  });
  return <div className="space-y-8">{out}</div>;
}
