"use client";

import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";
import { Fragment } from "react";

interface MathMessageProps {
  content: string;
  className?: string;
}

/**
 * Renders text with LaTeX math expressions
 * - Inline math: $...$ or \(...\)
 * - Block math: $$...$$ or \[...\]
 */
export default function MathMessage({ content, className }: MathMessageProps) {
  // Split by block math first ($$...$$), then handle inline
  const parts = parseContent(content);

  return (
    <p className={className}>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </p>
  );
}

type ParsedPart = string | JSX.Element;

function parseContent(text: string): ParsedPart[] {
  const result: ParsedPart[] = [];

  // Regex for block math: $$...$$ (non-greedy)
  const blockRegex = /\$\$([\s\S]+?)\$\$/g;

  let lastIndex = 0;
  let match;

  // First pass: extract block math
  while ((match = blockRegex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      result.push(...parseInlineMath(text.slice(lastIndex, match.index)));
    }

    // Add block math
    try {
      result.push(
        <span key={`block-${match.index}`} className="block my-2">
          <BlockMath math={match[1].trim()} />
        </span>,
      );
    } catch {
      // If KaTeX fails, show original
      result.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Handle remaining text
  if (lastIndex < text.length) {
    result.push(...parseInlineMath(text.slice(lastIndex)));
  }

  return result;
}

function parseInlineMath(text: string): ParsedPart[] {
  const result: ParsedPart[] = [];

  // Regex for inline math: $...$ (not preceded/followed by $)
  // Handles: $x$, $v_0$, $a = 9.8$, etc.
  const inlineRegex = /\$([^\$]+?)\$/g;

  let lastIndex = 0;
  let match;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    // Add inline math
    try {
      result.push(
        <InlineMath key={`inline-${match.index}`} math={match[1].trim()} />,
      );
    } catch {
      // If KaTeX fails, show original
      result.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}
