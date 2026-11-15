import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownMessageProps {
  text: string;
  isLight?: boolean;
}

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignore if clipboard denied
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/80 bg-[#080d16] text-slate-100 shadow-md">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#111928] border-b border-slate-800 text-[11px] font-mono text-slate-300">
        <span className="uppercase tracking-wider">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code snippet"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-[12px] leading-relaxed font-mono text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
};

function renderInlineFormatting(line: string, isLight: boolean): React.ReactNode[] {
  const tokenRegex = /(`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*)/g;
  const parts = line.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={idx}
          className={`px-1.5 py-0.5 rounded-md text-[12px] font-mono ${
            isLight
              ? 'bg-slate-200/80 text-slate-900 border border-slate-300'
              : 'bg-[#1a273d] text-sky-300 border border-[#2a3f61]'
          }`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline underline-offset-2 font-medium ${
            isLight ? 'text-blue-600 hover:text-blue-700' : 'text-sky-400 hover:text-sky-300'
          }`}
        >
          {linkMatch[1]}
        </a>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={idx} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <del key={idx} className="opacity-70">
          {part.slice(2, -2)}
        </del>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 3) {
      return (
        <em key={idx} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|') && !trimmed.includes('-')) return false;
  const cells = splitTableRow(trimmed);
  return cells.length >= 2 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function renderTextSegment(segment: string, isLight: boolean, keyPrefix: string): React.ReactNode {
  const lines = segment.split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: { ordered: boolean; items: string[] } | null = null;

  const flushList = (keySuffix: number) => {
    if (!listItems) return;
    if (listItems.ordered) {
      nodes.push(
        <ol key={`${keyPrefix}-ol-${keySuffix}`} className="list-decimal pl-5 my-2 space-y-1">
          {listItems.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineFormatting(item, isLight)}
            </li>
          ))}
        </ol>
      );
    } else {
      nodes.push(
        <ul key={`${keyPrefix}-ul-${keySuffix}`} className="list-disc pl-5 my-2 space-y-1">
          {listItems.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineFormatting(item, isLight)}
            </li>
          ))}
        </ul>
      );
    }
    listItems = null;
  };

  for (let index = 0; index < lines.length; index++) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList(index);
      continue;
    }

    // Markdown Table Detection (Header row + separator row)
    if (
      trimmed.includes('|') &&
      index + 1 < lines.length &&
      isTableSeparatorLine(lines[index + 1])
    ) {
      flushList(index);
      const headers = splitTableRow(trimmed);
      const rows: string[][] = [];
      let scan = index + 2;
      while (scan < lines.length) {
        const rowLine = lines[scan].trim();
        if (!rowLine || !rowLine.includes('|')) break;
        rows.push(splitTableRow(rowLine));
        scan++;
      }

      nodes.push(
        <div
          key={`${keyPrefix}-tbl-${index}`}
          className={`my-2.5 overflow-x-auto rounded-xl border ${
            isLight ? 'border-slate-200 bg-white' : 'border-[#233758] bg-[#0b1322]'
          }`}
        >
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr
                className={
                  isLight
                    ? 'bg-slate-100 text-slate-900 border-b border-slate-200'
                    : 'bg-[#14223a] text-slate-100 border-b border-[#233758]'
                }
              >
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="px-2.5 py-2 font-bold whitespace-nowrap">
                    {renderInlineFormatting(h, isLight)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={isLight ? 'divide-y divide-slate-200' : 'divide-y divide-[#1a2b46]'}>
              {rows.map((cells, rIdx) => (
                <tr
                  key={rIdx}
                  className={
                    isLight
                      ? rIdx % 2 === 1
                        ? 'bg-slate-50/70'
                        : 'bg-white'
                      : rIdx % 2 === 1
                      ? 'bg-[#0e1829]'
                      : 'bg-transparent'
                  }
                >
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-2.5 py-1.5 align-top leading-snug">
                      {renderInlineFormatting(cells[cIdx] ?? '', isLight)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      index = scan - 1;
      continue;
    }

    const bulletMatch = rawLine.match(/^\s*[-*•]\s+(.+)$/);
    if (bulletMatch) {
      if (listItems && listItems.ordered) flushList(index);
      if (!listItems) listItems = { ordered: false, items: [] };
      listItems.items.push(bulletMatch[1]);
      continue;
    }

    const orderedMatch = rawLine.match(/^\s*\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      if (listItems && !listItems.ordered) flushList(index);
      if (!listItems) listItems = { ordered: true, items: [] };
      listItems.items.push(orderedMatch[1]);
      continue;
    }

    flushList(index);

    if (trimmed === '---' || trimmed === '***') {
      nodes.push(
        <hr
          key={`${keyPrefix}-hr-${index}`}
          className={`my-3 ${isLight ? 'border-slate-200' : 'border-slate-700/70'}`}
        />
      );
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      nodes.push(
        <h5 key={`${keyPrefix}-h5-${index}`} className="text-[13px] font-bold mt-2.5 mb-1">
          {renderInlineFormatting(trimmed.slice(5), isLight)}
        </h5>
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      nodes.push(
        <h4 key={`${keyPrefix}-h4-${index}`} className="text-sm font-bold mt-3 mb-1">
          {renderInlineFormatting(trimmed.slice(4), isLight)}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      nodes.push(
        <h3 key={`${keyPrefix}-h3-${index}`} className="text-[15px] font-bold mt-3.5 mb-1.5">
          {renderInlineFormatting(trimmed.slice(3), isLight)}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      nodes.push(
        <h2 key={`${keyPrefix}-h2-${index}`} className="text-base font-extrabold mt-3.5 mb-2">
          {renderInlineFormatting(trimmed.slice(2), isLight)}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith('> ')) {
      nodes.push(
        <blockquote
          key={`${keyPrefix}-bq-${index}`}
          className={`border-l-2 pl-3 my-2 italic ${
            isLight ? 'border-blue-500 text-slate-600' : 'border-sky-400 text-slate-300'
          }`}
        >
          {renderInlineFormatting(trimmed.slice(2), isLight)}
        </blockquote>
      );
      continue;
    }

    nodes.push(
      <p key={`${keyPrefix}-p-${index}`} className="leading-relaxed my-1.5 whitespace-pre-wrap">
        {renderInlineFormatting(rawLine, isLight)}
      </p>
    );
  }

  flushList(lines.length);
  return nodes;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ text, isLight = false }) => {
  if (!text) return null;

  // Split out fenced code blocks cleanly (handle optional CR + spaces after lang)
  const segments: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)[ \t]*\r?\n([\s\S]*?)```/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      segments.push({ type: 'text', content: text.slice(lastIdx, match.index) });
    }
    segments.push({
      type: 'code',
      language: match[1] || 'code',
      content: match[2].replace(/\n$/, ''),
    });
    lastIdx = codeBlockRegex.lastIndex;
  }

  if (lastIdx < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIdx) });
  }

  return (
    <div className="text-[13.5px] sm:text-sm break-words">
      {segments.map((seg, idx) =>
        seg.type === 'code' ? (
          <CodeBlock key={`code-${idx}`} language={seg.language || 'code'} code={seg.content} />
        ) : (
          <React.Fragment key={`txt-${idx}`}>
            {renderTextSegment(seg.content, isLight, `seg-${idx}`)}
          </React.Fragment>
        )
      )}
    </div>
  );
};
