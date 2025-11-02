import React from 'react';
import { MoodEntry, MoodColor, Settings, MOOD_EMOJIS, MONTH_NAMES } from './types';

export const getCalendarIconSvg = (color: string): string => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${color}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='18' rx='2' ry='2'></rect><line x1='16' y1='2' x2='16' y2='6'></line><line x1='8' y1='2' x2='8' y2='6'></line><line x1='3' y1='10' x2='21' y2='10'></line></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

export const calculateGradientColors = (baseColor: string): { from: string; via: string; to: string } => {
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const adjust = (value: number, amount: number, isDarken: boolean) => {
    if (isDarken) {
      return Math.max(0, Math.floor(value * (1 - amount)));
    } else {
      return Math.min(255, Math.floor(value + (255 - value) * amount));
    }
  };

  const fromR = adjust(r, 0.06, true);
  const fromG = adjust(g, 0.06, true);
  const fromB = adjust(b, 0.06, true);

  const viaR = adjust(r, 0.02, false);
  const viaG = adjust(g, 0.02, false);
  const viaB = adjust(b, 0.02, false);

  const toR = adjust(r, 0.06, true);
  const toG = adjust(g, 0.06, true);
  const toB = adjust(b, 0.06, true);

  return {
    from: `#${fromR.toString(16).padStart(2, '0')}${fromG.toString(16).padStart(2, '0')}${fromB.toString(16).padStart(2, '0')}`,
    via: `#${viaR.toString(16).padStart(2, '0')}${viaG.toString(16).padStart(2, '0')}${viaB.toString(16).padStart(2, '0')}`,
    to: `#${toR.toString(16).padStart(2, '0')}${toG.toString(16).padStart(2, '0')}${toB.toString(16).padStart(2, '0')}`,
  };
};

export const getMoodStyle = (mood: MoodColor, settings: Settings, isFuture: boolean) => {
  const color = settings.customColors.moods[mood];
  return isFuture
    ? { backgroundColor: 'transparent', border: `3px solid ${color}` }
    : { backgroundColor: color };
};

export const getTextWithTags = (element: HTMLElement): string => {
  let result = '';
  const traverse = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      if (tagName === 'b' || tagName === 'strong') {
        result += '<b>';
        Array.from(node.childNodes).forEach(traverse);
        result += '</b>';
      } else if (tagName === 'i' || tagName === 'em') {
        result += '<i>';
        Array.from(node.childNodes).forEach(traverse);
        result += '</i>';
      } else if (tagName === 'u') {
        result += '<u>';
        Array.from(node.childNodes).forEach(traverse);
        result += '</u>';
      } else if (tagName === 'br') {
        result += '\n';
      } else if (tagName === 'div') {
        if (result && !result.endsWith('\n')) result += '\n';
        Array.from(node.childNodes).forEach(traverse);
      } else {
        Array.from(node.childNodes).forEach(traverse);
      }
    }
  };
  Array.from(element.childNodes).forEach(traverse);
  return cleanupTags(result);
};

export const cleanupTags = (text: string): string => {
  const segments: Array<{ text: string; tags: Set<string> }> = [];
  const tagStack: string[] = [];
  let currentText = '';
  let i = 0;

  while (i < text.length) {
    const tagMatch = text.substring(i).match(/^<(\/?)([biu])>/);

    if (tagMatch) {
      if (currentText) {
        segments.push({ text: currentText, tags: new Set(tagStack) });
        currentText = '';
      }

      const isClosing = tagMatch[1] === '/';
      const tag = tagMatch[2];

      if (isClosing) {
        const index = tagStack.indexOf(tag);
        if (index !== -1) {
          tagStack.splice(index, 1);
        }
      } else {
        tagStack.push(tag);
      }

      i += tagMatch[0].length;
    } else {
      currentText += text[i];
      i++;
    }
  }

  if (currentText) {
    segments.push({ text: currentText, tags: new Set(tagStack) });
  }

  let result = '';
  let activeTags = new Set<string>();

  for (const segment of segments) {
    const toClose = [...activeTags].filter(tag => !segment.tags.has(tag));
    const toOpen = [...segment.tags].filter(tag => !activeTags.has(tag));

    toClose.forEach(tag => {
      result += `</${tag}>`;
    });

    toOpen.forEach(tag => {
      result += `<${tag}>`;
    });

    result += segment.text;
    activeTags = new Set(segment.tags);
  }

  [...activeTags].forEach(tag => {
    result += `</${tag}>`;
  });

  return result;
};
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate.getTime() === today.getTime();
};

export const isFutureDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate.getTime() > today.getTime();
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const getFirstDayOfMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

export const getMonthsInYear = (year: number): Date[] => {
  return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
};

export const formatDisplayDate = (date: Date): string => {
  return `${date
    .toLocaleDateString(undefined, { month: 'long' })
    .toUpperCase()} ${date.getDate()} ${date.getFullYear()}, ${date
    .toLocaleDateString(undefined, { weekday: 'long' })
    .toUpperCase()}`;
};

// Entry Utilities
export const getValidEntries = (entries: MoodEntry[]): MoodEntry[] =>
  entries.filter((entry) => entry.mood !== 'grey' || entry.diary.trim());

export const sortEntriesByDate = (entries: MoodEntry[], ascending = true): MoodEntry[] => {
  return [...entries].sort((a, b) => {
    const dateA = parseDate(a.date).getTime();
    const dateB = parseDate(b.date).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

export const filterEntriesBySearch = (entries: MoodEntry[], query: string, settings: Settings): MoodEntry[] => {
  if (!query.trim()) return entries;

  const searchTerm = query.toLowerCase();
  return entries.filter((entry) => {
    const date = parseDate(entry.date);
    const formattedDate = formatDisplayDate(date).toLowerCase();
    const moodLabel = settings.customLabels[entry.mood].toLowerCase();
    const diary = entry.diary || '';

    return (
      diary.toLowerCase().includes(searchTerm) ||
      formattedDate.includes(searchTerm) ||
      moodLabel.includes(searchTerm)
    );
  });
};

export const exportData = (entries: MoodEntry[]): string => {
  const validEntries = getValidEntries(entries);
  if (validEntries.length === 0) return 'No entries to export.';

  const sortedEntries = sortEntriesByDate(validEntries, false);

  return sortedEntries
    .map((entry) => {
      const date = parseDate(entry.date);
      const formattedDate = formatDisplayDate(date);
      const emoji = MOOD_EMOJIS[entry.mood];
      const cleanedDiary = cleanupTags(entry.diary || '');

      return `${emoji} ${formattedDate}\n${cleanedDiary}`;
    })
    .join('\n\n');
};

export const importData = (content: string): MoodEntry[] => {
  if (!content?.trim()) {
    throw new Error('File is empty or contains no valid data.');
  }

  const entries: MoodEntry[] = [];
  const lines = content.trim().split('\n');
  const blocks: string[] = [];
  let currentBlock = '';

  const emojiToMood = {
    '⚪': 'grey',
    '🔴': 'red',
    '🟠': 'orange',
    '🟡': 'yellow',
    '🟢': 'green',
    '🔵': 'blue',
    '🟣': 'purple',
  } as const;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const isNewEntry = /^([🔴🟠🟡🟢🔵🟣⚪])\s+([A-Z]+)\s+(\d+)\s+(\d{4}),\s+[A-Z]+$/iu.test(trimmedLine);

    if (isNewEntry && currentBlock.trim()) {
      blocks.push(currentBlock.trim());
      currentBlock = trimmedLine;
    } else if (isNewEntry) {
      currentBlock = trimmedLine;
    } else if (trimmedLine || currentBlock) {
      if (currentBlock) currentBlock += '\n';
      currentBlock += trimmedLine;
    }
  }

  if (currentBlock.trim()) {
    blocks.push(currentBlock.trim());
  }

  const getMonthIndex = (monthName: string): number => {
    const upperMonthName = monthName.toUpperCase();

    let monthIndex = MONTH_NAMES.findIndex((name) => name.toUpperCase() === upperMonthName);
    if (monthIndex !== -1) return monthIndex;

    for (let i = 0; i < 12; i++) {
      const date = new Date(2024, i, 1);
      const localeMonth = date.toLocaleDateString(undefined, { month: 'long' }).toUpperCase();
      if (localeMonth === upperMonthName) {
        return i;
      }
    }

    return -1;
  };

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length === 0) continue;

    const firstLine = lines[0];
    const diary = lines.length > 1 ? lines.slice(1).join('\n').trim() : '';

    const emojiMatch = firstLine.match(/^([🔴🟠🟡🟢🔵🟣⚪])\s+(.+)$/u);
    if (!emojiMatch) continue;

    const [, emoji, dateText] = emojiMatch;
    const mood = emojiToMood[emoji as keyof typeof emojiToMood];
    if (!mood) continue;

    const dateMatch = dateText.match(/^([A-Z]+)\s+(\d+)\s+(\d{4}),\s+[A-Z]+$/i);
    if (!dateMatch) continue;

    const [, monthName] = dateMatch;
    const day = parseInt(dateMatch[2]);
    const year = parseInt(dateMatch[3]);

    const monthIndex = getMonthIndex(monthName);
    if (monthIndex === -1) continue;

    const entryDate = new Date(year, monthIndex, day);
    if (isNaN(entryDate.getTime())) continue;

    entries.push({
      date: formatDate(entryDate),
      mood,
      diary,
    });
  }

  if (entries.length === 0) {
    throw new Error('No valid entries found in the file. Please check the format.');
  }

  return entries;
};

export const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;

          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const processLineBreaks = (diary: string): React.ReactNode => {
  if (!diary) return null;

  const parts = diary.split(/(\n+)/);
  return parts.map((part, index) => {
    if (part.match(/^\n+$/)) {
      const newlineCount = part.length;
      const result = [];
      const doubleBreaks = Math.floor(newlineCount / 2);

      for (let i = 0; i < doubleBreaks; i++) {
        result.push(
          <span key={`double-${index}-${i}`} style={{ display: 'block', height: '1em' }} />
        );
      }

      if (newlineCount % 2 === 1) {
        result.push(<br key={`single-${index}`} />);
      }

      return <React.Fragment key={index}>{result}</React.Fragment>;
    }

    return <React.Fragment key={index}>{renderFormattedText(part)}</React.Fragment>;
  });
};

const renderFormattedText = (text: string): React.ReactNode => {
  const segments: React.ReactNode[] = [];
  let currentIndex = 0;
  const tagRegex = /<(\/?)([biu])>/g;
  let match;
  let segmentKey = 0;

  const tagStack: Array<'b' | 'i' | 'u'> = [];

  const updateActiveStyles = () => {
    return {
      bold: tagStack.includes('b'),
      italic: tagStack.includes('i'),
      underline: tagStack.includes('u'),
    };
  };

  while ((match = tagRegex.exec(text)) !== null) {
    const beforeTag = text.substring(currentIndex, match.index);
    if (beforeTag) {
      const activeStyles = updateActiveStyles();
      segments.push(
        <span
          key={`text-${segmentKey++}`}
          style={{
            fontWeight: activeStyles.bold ? 'bold' : 'normal',
            fontStyle: activeStyles.italic ? 'italic' : 'normal',
            textDecoration: activeStyles.underline ? 'underline' : 'none',
          }}
        >
          {beforeTag}
        </span>
      );
    }

    const isClosing = match[1] === '/';
    const tag = match[2] as 'b' | 'i' | 'u';

    if (isClosing) {
      const lastIndex = tagStack.lastIndexOf(tag);
      if (lastIndex !== -1) {
        tagStack.splice(lastIndex, 1);
      }
    } else {
      tagStack.push(tag);
    }

    currentIndex = match.index + match[0].length;
  }

  const remainingText = text.substring(currentIndex);
  if (remainingText) {
    const activeStyles = updateActiveStyles();
    segments.push(
      <span
        key={`text-${segmentKey++}`}
        style={{
          fontWeight: activeStyles.bold ? 'bold' : 'normal',
          fontStyle: activeStyles.italic ? 'italic' : 'normal',
          textDecoration: activeStyles.underline ? 'underline' : 'none',
        }}
      >
        {remainingText}
      </span>
    );
  }

  return segments.length > 0 ? segments : text;
};
