import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, Undo, Redo, Bold, Italic, Underline, Save, Check } from 'lucide-react';
import { MoodEntry, MoodColor, Settings, MOOD_COLORS } from './types';
import { formatDate, formatDisplayDate, cleanupTags, getTextWithTags } from './utils';
import { useHistory } from './hooks';

const MoodSelector: React.FC<{
  selectedMood: MoodColor;
  onMoodChange: (mood: MoodColor) => void;
  customLabels: Record<MoodColor, string>;
}> = React.memo(({ selectedMood, onMoodChange, customLabels }) => {
  const selectedIndex = useMemo(
    () => MOOD_COLORS.findIndex((color) => color === selectedMood),
    [selectedMood]
  );

  const getCircleStyle = useCallback((index: number) => {
    const isSelected = index === selectedIndex;
    const distance = Math.abs(index - selectedIndex);

    if (!isSelected && distance <= 2) {
      const direction = index < selectedIndex ? -1 : 1;
      const pushAmount = distance === 1 ? 4 : 2;
      return { transform: `translateX(${direction * pushAmount}px)`, zIndex: 1 };
    }

    return { transform: '', zIndex: isSelected ? 10 : 1 };
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, color: MoodColor) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onMoodChange(color);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const currentIndex = MOOD_COLORS.findIndex((c) => c === selectedMood);
      const direction = e.key === 'ArrowLeft' ? -1 : 1;
      const newIndex = Math.max(0, Math.min(MOOD_COLORS.length - 1, currentIndex + direction));
      onMoodChange(MOOD_COLORS[newIndex]);
    }
  }, [selectedMood, onMoodChange]);

  return (
    <div className="grid-mood-selector gap-4 sm:gap-5 md:gap-6">
      {MOOD_COLORS.map((color, index) => (
        <button
          key={color}
          onClick={() => onMoodChange(color)}
          onKeyDown={(e) => handleKeyDown(e, color)}
          className={`mood-selector-circle mood-selector-${color} ${
            selectedMood === color ? 'mood-selector-circle-selected' : 'mood-selector-circle-unselected'
          }`}
          style={getCircleStyle(index)}
          aria-label={`Select ${customLabels[color]} mood`}
          aria-pressed={selectedMood === color}
          tabIndex={selectedMood === color ? 0 : -1}
          type="button"
        />
      ))}
    </div>
  );
});

export const Diary: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  entry?: MoodEntry;
  onSave: (entry: MoodEntry) => void;
  settings: Settings;
}> = ({ isOpen, onClose, date, entry, onSave, settings }) => {
  const [mood, setMood] = useState<MoodColor>('grey');
  const [diary, setDiary] = useState('');
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });
  const savedSelectionRef = useRef<Range | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const { addToHistory, undo, redo, canUndo, canRedo } = useHistory<{
    diary: string;
    mood: MoodColor;
  }>({ diary: '', mood: 'grey' });

  const formattedDate = useMemo(() => formatDisplayDate(date), [date]);

  useEffect(() => {
    if (entry) {
      setMood(entry.mood || 'grey');
      const cleanedDiary = cleanupTags(entry.diary || '');
      setDiary(cleanedDiary);
    } else {
      setMood('grey');
      setDiary('');
    }
  }, [entry, date]);

  const debouncedAddToHistory = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (state: { diary: string; mood: MoodColor }) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => addToHistory(state), 500);
    };
  }, [addToHistory]);

  useEffect(() => {
    debouncedAddToHistory({ diary, mood });
  }, [diary, mood, debouncedAddToHistory]);

  const handleUndo = useCallback(() => {
    const previousState = undo();
    if (previousState) {
      setDiary(previousState.diary || '');
      setMood(previousState.mood || 'grey');
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setDiary(nextState.diary || '');
      setMood(nextState.mood || 'grey');
    }
  }, [redo]);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const element = contentEditableRef.current;
    if (!element) return;

    element.focus();

    const selection = window.getSelection();
    if (savedSelectionRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedSelectionRef.current);
    }
  }, []);

  const updateActiveFormats = useCallback((forceClear = false) => {
    const element = contentEditableRef.current;

    if (forceClear || !element || !element.contains(document.activeElement)) {
      setActiveFormats({ bold: false, italic: false, underline: false });
      return;
    }

    try {
      const formats = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline')
      };

      setActiveFormats(formats);
    } catch {
      const selection = window.getSelection();
      if (!selection) return;

      let node = selection.anchorNode;
      const formats = { bold: false, italic: false, underline: false };

      while (node && node !== element) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tagName = el.tagName?.toLowerCase();
          if (tagName === 'b' || tagName === 'strong') formats.bold = true;
          if (tagName === 'i' || tagName === 'em') formats.italic = true;
          if (tagName === 'u') formats.underline = true;
        }
        node = node.parentNode;
      }

      setActiveFormats(formats);
    }
  }, []);

  const applyFormatting = useCallback((command: 'bold' | 'italic' | 'underline') => {
    const element = contentEditableRef.current;
    if (!element) return;

    restoreSelection();

    try {
      document.execCommand(command, false, undefined);

      const currentText = getTextWithTags(element);
      setDiary(currentText);

      saveSelection();
      updateActiveFormats();
    } catch (e) {
      console.error('Format command failed:', e);
    }
  }, [restoreSelection, saveSelection, updateActiveFormats]);

  const handleContentChange = useCallback(() => {
    const element = contentEditableRef.current;
    if (!element) return;
    const newText = getTextWithTags(element);
    setDiary(newText);
    saveSelection();
    updateActiveFormats();
  }, [saveSelection, updateActiveFormats]);

  const handleContentClick = useCallback(() => {
    saveSelection();
    updateActiveFormats();
  }, [saveSelection, updateActiveFormats]);

  const handleContentKeyUp = useCallback((e: React.KeyboardEvent) => {
    saveSelection();
    updateActiveFormats();

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        applyFormatting('bold');
      } else if (e.key === 'i') {
        e.preventDefault();
        applyFormatting('italic');
      } else if (e.key === 'u') {
        e.preventDefault();
        applyFormatting('underline');
      }
    }
  }, [saveSelection, updateActiveFormats, applyFormatting]);

  const handleContentKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'i' || e.key === 'u') {
        e.preventDefault();
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    saveSelection();
    updateActiveFormats();
  }, [saveSelection, updateActiveFormats]);

  const handleBlur = useCallback(() => {
    savedSelectionRef.current = null;
    updateActiveFormats(true);
  }, [updateActiveFormats]);

  const handleFocus = useCallback(() => {
    updateActiveFormats();
  }, [updateActiveFormats]);

  const convertTagsToHTML = useCallback((text: string): string => {
    const cleaned = cleanupTags(text);
    return cleaned.replace(/\n/g, '<br>');
  }, []);

  useEffect(() => {
    const element = contentEditableRef.current;
    if (!element) return;

    const currentText = getTextWithTags(element);
    if (currentText !== diary) {
      const htmlContent = convertTagsToHTML(diary);
      element.innerHTML = htmlContent;
    }
  }, [diary, convertTagsToHTML]);

  const handleSave = useCallback(() => {
    setSaveState('saving');
    onSave({
      date: formatDate(date),
      mood,
      diary,
    });

    setTimeout(() => {
      setSaveState('saved');
      setTimeout(() => {
        setSaveState('idle');
      }, 1000);
    }, 600);
  }, [date, mood, diary, onSave]);

  const handleSaveAndClose = useCallback(() => {
    onSave({
      date: formatDate(date),
      mood,
      diary,
    });
    onClose();
  }, [date, mood, diary, onSave, onClose]);

  const handleClose = useCallback(() => {
    onSave({
      date: formatDate(date),
      mood,
      diary,
    });
    onClose();
  }, [date, mood, diary, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 z-50">
      <div className="diary-modal-container">
        <div className="header-container diary-header">
          <button onClick={handleClose} className="btn-icon" title="Close">
            <ChevronLeft size={24} />
          </button>

          <h2 className="header-title">{formattedDate}</h2>

          <button onClick={handleSave} className="btn-icon save-button-container" title="Save" disabled={saveState !== 'idle'}>
            <div className="save-icon-wrapper">
              {saveState === 'idle' && <Save size={24} />}
              {saveState === 'saving' && (
                <div className="save-spinner" />
              )}
              {saveState === 'saved' && <Check size={24} className="checkmark-icon" />}
            </div>
          </button>
        </div>

        <div className="diary-content-compact">
          <div className="diary-mood-section" style={{ backgroundColor: settings.customColors.base }}>
            <h3 className="diary-mood-title">How are you feeling?</h3>
            <div className="diary-mood-selector">
              <div className="flex flex-col items-center gap-0.5">
                <MoodSelector selectedMood={mood} onMoodChange={setMood} customLabels={settings.customLabels} />
                <div className="diary-mood-label mt-0.5">{settings.customLabels[mood]}</div>
              </div>
            </div>
          </div>

          <div className="diary-textarea-container-compact">
            <div className="flex-1 min-h-0 relative">
              <div
                ref={contentEditableRef}
                contentEditable
                onInput={handleContentChange}
                onClick={handleContentClick}
                onKeyUp={handleContentKeyUp}
                onKeyDown={handleContentKeyDown}
                onMouseUp={handleMouseUp}
                onBlur={handleBlur}
                onFocus={handleFocus}
                className="diary-textarea"
                aria-label="Journal entry for today"
                suppressContentEditableWarning
                data-placeholder="Today, I..."
              />
            </div>

            <div className="diary-actions-compact">
              <div className="flex gap-1">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatting('bold')}
                  className={`diary-action-button ${activeFormats.bold ? 'diary-action-active' : ''}`}
                  title="Bold (Ctrl+B)"
                  type="button"
                >
                  <Bold size={18} />
                </button>

                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatting('italic')}
                  className={`diary-action-button ${activeFormats.italic ? 'diary-action-active' : ''}`}
                  title="Italic (Ctrl+I)"
                  type="button"
                >
                  <Italic size={18} />
                </button>

                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatting('underline')}
                  className={`diary-action-button ${activeFormats.underline ? 'diary-action-active' : ''}`}
                  title="Underline (Ctrl+U)"
                  type="button"
                >
                  <Underline size={18} />
                </button>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className={`diary-action-button ${!canUndo ? 'diary-action-disabled' : ''}`}
                  title="Undo"
                >
                  <Undo size={18} />
                </button>

                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className={`diary-action-button ${!canRedo ? 'diary-action-disabled' : ''}`}
                  title="Redo"
                >
                  <Redo size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
