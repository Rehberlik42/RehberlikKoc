/** Basit markdown-benzeri govde (##, ###, >, liste, paragraf) — harici kutuphane yok */

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

const BLOCK_ANIM =
  "animate-in fade-in fill-mode-both duration-300 motion-reduce:animate-none";

function blockDelay(index: number) {
  return { animationDelay: `${Math.min(index * 40, 320)}ms` };
}

export default function BlogBody({ body }: { body: string }) {
  const lines = body.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;
  let blockIndex = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    const idx = blockIndex++;
    blocks.push(
      <ul
        key={key++}
        className={`my-5 list-outside list-disc space-y-2.5 pl-5 text-base leading-loose text-[var(--text-secondary)] marker:text-[var(--accent)]/70 ${BLOCK_ANIM}`}
        style={blockDelay(idx)}
      >
        {listItems.map((li, i) => (
          <li key={i} className="pl-1">
            {renderInline(li)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushList();
      const idx = blockIndex++;
      blocks.push(
        <h3
          key={key++}
          className={`mb-3 mt-9 text-lg font-bold tracking-tight text-[var(--text-primary)] first:mt-0 ${BLOCK_ANIM}`}
          style={blockDelay(idx)}
        >
          {trimmed.slice(4)}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      const idx = blockIndex++;
      blocks.push(
        <h2
          key={key++}
          className={`mb-4 mt-11 border-b border-[var(--border)] pb-2.5 text-xl font-black tracking-tight text-[var(--text-primary)] first:mt-0 sm:text-2xl ${BLOCK_ANIM}`}
          style={blockDelay(idx)}
        >
          {trimmed.slice(3)}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("> ")) {
      flushList();
      const idx = blockIndex++;
      blocks.push(
        <blockquote
          key={key++}
          className={`my-6 rounded-r-xl border-l-[3px] border-[var(--primary)]/55 bg-[var(--primary)]/[0.06] py-3 pl-5 pr-4 text-base leading-relaxed text-[var(--accent)]/95 ${BLOCK_ANIM}`}
          style={blockDelay(idx)}
        >
          <span className="italic">{renderInline(trimmed.slice(2))}</span>
        </blockquote>
      );
      continue;
    }
    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2));
      continue;
    }
    flushList();
    const idx = blockIndex++;
    blocks.push(
      <p
        key={key++}
        className={`my-4 text-base leading-loose text-[var(--text-secondary)] ${BLOCK_ANIM}`}
        style={blockDelay(idx)}
      >
        {renderInline(trimmed)}
      </p>
    );
  }
  flushList();

  return (
    <div className="mx-auto max-w-[68ch] text-[17px] leading-relaxed sm:text-base">
      {blocks}
    </div>
  );
}
