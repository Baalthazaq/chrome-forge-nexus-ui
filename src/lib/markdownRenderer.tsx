import React from 'react';

/**
 * Simple markdown-to-JSX renderer for ToMe content.
 * Supports: # headers, **bold**, *italic*, - lists, --- hr, line breaks, ![img](url)
 */
export const renderMarkdown = (text: string): React.ReactNode[] => {
  if (!text) return [];
  
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  
  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2 text-gray-300">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  const renderInline = (line: string): React.ReactNode => {
    // Process bold and italic inline
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      if (match[2]) {
        // Bold
        parts.push(<strong key={match.index} className="font-bold text-white">{match[2]}</strong>);
      } else if (match[3]) {
        // Italic
        parts.push(<em key={match.index} className="italic">{match[3]}</em>);
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    return parts.length > 0 ? parts : line;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushList();
      elements.push(<hr key={`hr-${i}`} className="border-gray-700 my-4" />);
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-bold text-purple-400 mt-4 mb-2">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl font-bold text-purple-300 mt-5 mb-2">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={`h1-${i}`} className="text-2xl font-bold text-white mt-6 mb-3">
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }

    // Image
    const imgMatch = line.match(/^Image:\s*(.+)$/);
    if (imgMatch) {
      flushList();
      elements.push(
        <img key={`img-${i}`} src={imgMatch[1].trim()} alt="" className="rounded-lg max-w-full max-h-64 my-3 object-cover" />
      );
      continue;
    }

    // List item
    if (line.startsWith('- ')) {
      listItems.push(
        <li key={`li-${i}`} className="text-sm">{renderInline(line.slice(2))}</li>
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      elements.push(<div key={`br-${i}`} className="h-2" />);
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-gray-300 text-base leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  flushList();
  return elements;
};
