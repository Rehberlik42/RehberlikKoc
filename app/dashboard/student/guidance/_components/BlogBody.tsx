/** Basit markdown-benzeri govde (##, ###, >, liste, paragraf) — harici kutuphane yok */

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function BlogBody({ body }: { body: string }) {
  const lines = body.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul
        key={key++}
        className="list-disc list-inside space-y-2 text-white/75 text-base leading-relaxed my-4 pl-1"
      >
        {listItems.map((li, i) => (
          <li key={i}>{renderInline(li)}</li>
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
      blocks.push(
        <h3
          key={key++}
          className="text-white text-lg font-bold mt-8 mb-3 first:mt-0"
        >
          {trimmed.slice(4)}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2
          key={key++}
          className="text-white text-xl sm:text-2xl font-black mt-10 mb-4 first:mt-0 pb-2 border-b border-white/10"
        >
          {trimmed.slice(3)}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("> ")) {
      flushList();
      blocks.push(
        <blockquote
          key={key++}
          className="border-l-2 border-[#7B2FFF]/50 pl-4 py-2 my-4 text-[#A78BFF]/90 italic text-base bg-[#7B2FFF]/5 rounded-r-lg"
        >
          {renderInline(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }
    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2));
      continue;
    }
    flushList();
    blocks.push(
      <p
        key={key++}
        className="text-white/75 text-base leading-relaxed my-4"
      >
        {renderInline(trimmed)}
      </p>
    );
  }
  flushList();

  return (
    <div className="max-w-none prose-invert">{blocks}</div>
  );
}
