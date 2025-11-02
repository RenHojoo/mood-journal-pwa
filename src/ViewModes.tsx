import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { MoodEntry, MoodColor, Settings, ViewMode, WEEKDAYS } from './types';
import { formatDate, getDaysInMonth, getFirstDayOfMonth, isToday, addMonths, getMonthsInYear, parseDate, isFutureDate, formatDisplayDate, filterEntriesBySearch, sortEntriesByDate, processLineBreaks, getMoodStyle } from './utils';
import { useGestureNavigation } from './hooks';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  windowHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

function VirtualList<T>({
  items,
  itemHeight,
  windowHeight,
  overscan = 3,
  renderItem,
  className = '',
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const { visibleRange, totalHeight, offsetY } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + windowHeight) / itemHeight) + overscan
    );

    return {
      visibleRange: { startIndex, endIndex },
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [scrollTop, itemHeight, windowHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={className}
      style={{
        height: windowHeight,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) =>
            renderItem(item, visibleRange.startIndex + i)
          )}
        </div>
      </div>
    </div>
  );
}

const SIZE_CLASSES = {
  small: 'calendar-day-small',
  medium: 'calendar-day-medium',
  large: 'calendar-day-large',
} as const;

const CalendarDay: React.FC<{
  date: Date;
  mood: MoodColor;
  hasEntry: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  size?: 'small' | 'medium' | 'large';
  settings: Settings;
  onClick: () => void;
}> = React.memo(({ date, mood, hasEntry, isToday, isCurrentMonth, size = 'medium', settings, onClick }) => {
  const day = date.getDate();
  const isFuture = date > new Date();
  const circleStyle = useMemo(() => getMoodStyle(mood, settings, isFuture), [mood, settings, isFuture]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  const className = useMemo(() => [
    'calendar-day-base',
    SIZE_CLASSES[size],
    !isCurrentMonth && 'calendar-day-not-current-month',
    isFuture && 'calendar-day-future',
    hasEntry && !isToday && 'calendar-day-has-entry',
  ].filter(Boolean).join(' '), [size, isCurrentMonth, isFuture, hasEntry, isToday]);

  return (
    <button
      onClick={onClick}
      onKeyDown={handleKeyDown}
      style={circleStyle}
      className={className}
      aria-label={`${date.toDateString()}, ${hasEntry ? 'Has entry' : 'No entry'}`}
      type="button"
    >
      {size !== 'small' && <span className="leading-none">{day}</span>}
    </button>
  );
});

const EmptyState: React.FC<{ searchQuery?: string }> = React.memo(({ searchQuery = '' }) => {
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="empty-state">
      <div className="empty-state-icon">{hasSearch ? '🔍' : '🌸'}</div>
      <h3 className="empty-state-title">
        {hasSearch ? 'No results found...' : "There's nothing here..."}
      </h3>
      <p className="empty-state-subtitle">
        {hasSearch ? 'Try adjusting your search terms.' : 'Add a mood entry first!'}
      </p>
    </div>
  );
});

const EntryPreview: React.FC<{
  date: Date;
  entry?: MoodEntry;
  onClick: () => void;
  settings: Settings;
  truncateForDayView?: boolean;
  showMoodSelector?: boolean;
}> = React.memo(({ date, entry, onClick, settings, truncateForDayView = false, showMoodSelector = false }) => {
  const contentRef = React.useRef<HTMLParagraphElement>(null);
  const [needsTruncation, setNeedsTruncation] = React.useState(false);

  const formattedDate = useMemo(() => formatDisplayDate(date), [date]);
  const processedDiaryContent = useMemo(() => processLineBreaks(entry?.diary || ''), [entry?.diary]);
  const truncatedDiaryText = useMemo(
    () => entry?.diary && entry.diary.length > 100 ? entry.diary.substring(0, 100) + '...' : entry?.diary || '',
    [entry?.diary]
  );

  React.useEffect(() => {
    if (truncateForDayView && contentRef.current && entry?.diary) {
      const maxHeight = 192;
      setNeedsTruncation(contentRef.current.scrollHeight > maxHeight);
    }
  }, [truncateForDayView, entry?.diary]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  const moodColor = useMemo(
    () => entry?.mood ? settings.customColors.moods[entry.mood] : settings.customColors.moods.grey,
    [entry?.mood, settings.customColors.moods]
  );
  const moodLabel = entry?.mood ? settings.customLabels[entry.mood] : 'No mood selected';

  return (
    <div
      onClick={onClick}
      className="card-base cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-[1.02] entry-preview-centered"
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`Entry for ${formattedDate}${entry?.diary ? ': ' + truncatedDiaryText : ''}`}
    >
      <div className="entry-header">
        <h3 className="entry-date">{formattedDate}</h3>
        <div className="entry-mood-indicator">
          {entry || showMoodSelector ? (
            <div
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
              style={{ backgroundColor: moodColor }}
              aria-label={entry ? `Mood: ${moodLabel}` : 'No mood selected'}
            />
          ) : (
            <button
              onClick={handleButtonClick}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors flex-shrink-0"
            >
              Add Entry
            </button>
          )}
        </div>
      </div>
      {entry?.diary && (
        <p
          ref={contentRef}
          className={`entry-content ${
            truncateForDayView
              ? `entry-content-truncated ${needsTruncation ? 'needs-truncation' : ''}`
              : ''
          }`}
        >
          {processedDiaryContent}
        </p>
      )}
    </div>
  );
});

export const ViewDay: React.FC<{
  entries: MoodEntry[];
  onEntryClick: (entry: MoodEntry) => void;
  searchQuery?: string;
  settings: Settings;
  onViewModeChange: (mode: ViewMode, direction?: 'in' | 'out') => void;
}> = React.memo(({ entries, onEntryClick, searchQuery = '', settings, onViewModeChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [useVirtualization, setUseVirtualization] = useState(false);

  const handleZoomOut = useCallback(() => onViewModeChange('month', 'in'), [onViewModeChange]);
  useGestureNavigation(containerRef, { onZoomOut: handleZoomOut });

  const sortedEntries = useMemo(() => {
    const filtered = filterEntriesBySearch(entries, searchQuery, settings);
    return sortEntriesByDate(filtered, false);
  }, [entries, searchQuery, settings]);

  useEffect(() => {
    setUseVirtualization(sortedEntries.length > 20);
  }, [sortedEntries.length]);

  const renderEntry = useCallback((entry: MoodEntry) => (
    <EntryPreview
      key={entry.date}
      date={parseDate(entry.date)}
      entry={entry}
      onClick={() => onEntryClick(entry)}
      settings={settings}
      truncateForDayView={true}
    />
  ), [onEntryClick, settings]);

  if (sortedEntries.length === 0) {
    return (
      <div ref={containerRef} data-zoom-container className="calendar-container" role="list" aria-label="Mood entries">
        <EmptyState searchQuery={searchQuery} />
      </div>
    );
  }

  if (useVirtualization) {
    return (
      <div ref={containerRef} data-zoom-container className="calendar-container" role="list" aria-label="Mood entries">
        <VirtualList
          items={sortedEntries}
          itemHeight={250}
          windowHeight={typeof window !== 'undefined' ? window.innerHeight - 200 : 600}
          overscan={2}
          renderItem={(entry) => (
            <div key={entry.date} className="mb-3 sm:mb-4">
              {renderEntry(entry)}
            </div>
          )}
          className="space-y-3 sm:space-y-4"
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} data-zoom-container className="calendar-container" role="list" aria-label="Mood entries">
      <div className="space-y-3 sm:space-y-4">
        {sortedEntries.map(renderEntry)}
      </div>
    </div>
  );
});

export const ViewMonth: React.FC<{
  currentDate: Date;
  entries: MoodEntry[];
  onEntryEdit: (date: Date) => void;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode, direction?: 'in' | 'out') => void;
  settings: Settings;
}> = React.memo(({ currentDate, entries, onEntryEdit, onDateChange, onViewModeChange, settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  const entriesMap = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    for (let i = 0; i < entries.length; i++) {
      map.set(entries[i].date, entries[i]);
    }
    return map;
  }, [entries]);

  const getEntryForDate = useCallback((date: Date) => {
    return entriesMap.get(formatDate(date));
  }, [entriesMap]);

  const handleSwipeLeft = useCallback(() => onDateChange(addMonths(currentDate, 1)), [currentDate, onDateChange]);
  const handleSwipeRight = useCallback(() => onDateChange(addMonths(currentDate, -1)), [currentDate, onDateChange]);
  const handleZoomOut = useCallback(() => onViewModeChange('year', 'in'), [onViewModeChange]);
  const handleZoomIn = useCallback(() => onViewModeChange('day', 'out'), [onViewModeChange]);

  useGestureNavigation(containerRef, {
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onZoomOut: handleZoomOut,
    onZoomIn: handleZoomIn,
  });

  const selectedEntry = useMemo(
    () => selectedDate ? getEntryForDate(selectedDate) : undefined,
    [selectedDate, getEntryForDate]
  );

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    const result = [];

    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const prevMonthDays = getDaysInMonth(prevMonth);

    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day);
      const entry = getEntryForDate(date);

      result.push(
        <CalendarDay
          key={`prev-${day}`}
          date={date}
          mood={entry?.mood || 'grey'}
          hasEntry={!!entry}
          isToday={isToday(date)}
          isCurrentMonth={false}
          settings={settings}
          onClick={() => setSelectedDate(date)}
        />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const entry = getEntryForDate(date);

      result.push(
        <CalendarDay
          key={day}
          date={date}
          mood={entry?.mood || 'grey'}
          hasEntry={!!entry}
          isToday={isToday(date)}
          isCurrentMonth={true}
          settings={settings}
          onClick={() => setSelectedDate(date)}
        />
      );
    }

    const remainingDays = 42 - result.length;
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day);
      const entry = getEntryForDate(date);

      result.push(
        <CalendarDay
          key={`next-${day}`}
          date={date}
          mood={entry?.mood || 'grey'}
          hasEntry={!!entry}
          isToday={isToday(date)}
          isCurrentMonth={false}
          settings={settings}
          onClick={() => setSelectedDate(date)}
        />
      );
    }

    return result;
  }, [currentDate, settings, getEntryForDate]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} data-zoom-container className="card-base p-responsive-lg calendar-container">
        <div className="grid-calendar gap-1 sm:gap-2 lg:gap-3 mb-2 sm:mb-3 lg:mb-4">
          {WEEKDAYS.map((day) => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>

        <div className="grid-calendar gap-1.5 sm:gap-2">{calendarDays}</div>
      </div>

      {selectedDate && (
        <div className="space-responsive-sm">
          <EntryPreview
            date={selectedDate}
            entry={selectedEntry}
            onClick={() => onEntryEdit(selectedDate)}
            settings={settings}
            showMoodSelector={!selectedEntry}
          />
        </div>
      )}
    </div>
  );
});

const MiniMonth: React.FC<{
  monthDate: Date;
  entries: MoodEntry[];
  settings: Settings;
  onMonthClick: (date: Date) => void;
}> = React.memo(({ monthDate, entries, settings, onMonthClick }) => {
  const entriesMap = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    for (let i = 0; i < entries.length; i++) {
      map.set(entries[i].date, entries[i]);
    }
    return map;
  }, [entries]);

  const days = useMemo(() => {
    const daysInMonth = getDaysInMonth(monthDate);
    const firstDay = getFirstDayOfMonth(monthDate);
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    const result = [];

    for (let i = 0; i < adjustedFirstDay; i++) {
      result.push(<div key={`empty-${i}`} className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      const entry = entriesMap.get(formatDate(date));
      const isFuture = isFutureDate(date);
      const mood = entry?.mood || 'grey';
      const moodColor = settings.customColors.moods[mood];
      const dayStyle = isFuture
        ? { backgroundColor: 'transparent', border: `2px solid ${moodColor}` }
        : { backgroundColor: moodColor, border: 'none' };

      result.push(
        <div
          key={day}
          className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 rounded-full"
          style={dayStyle}
        />
      );
    }

    const totalSlots = 42;
    const usedSlots = adjustedFirstDay + daysInMonth;
    for (let i = usedSlots; i < totalSlots; i++) {
      result.push(<div key={`fill-${i}`} className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3" />);
    }

    return result;
  }, [monthDate, entriesMap, settings.customColors.moods]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onMonthClick(monthDate);
    }
  }, [monthDate, onMonthClick]);

  const handleClick = useCallback(() => onMonthClick(monthDate), [monthDate, onMonthClick]);

  const monthName = useMemo(() => monthDate.toLocaleDateString(undefined, { month: 'long' }), [monthDate]);

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="mini-month-container p-2 sm:p-2.5 lg:p-3"
      style={{ backgroundColor: settings.customColors.base }}
      aria-label={`View ${monthName} ${monthDate.getFullYear()}`}
      type="button"
    >
      <h3 className="mini-month-title">{monthName}</h3>
      <div className="mini-month-grid">{days}</div>
    </button>
  );
});

export const ViewYear: React.FC<{
  currentDate: Date;
  entries: MoodEntry[];
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode, direction?: 'in' | 'out') => void;
  settings: Settings;
}> = React.memo(({ currentDate, entries, onDateChange, onViewModeChange, settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const year = currentDate.getFullYear();

  const handleSwipeLeft = useCallback(() => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year + 1);
    onDateChange(newDate);
  }, [currentDate, year, onDateChange]);

  const handleSwipeRight = useCallback(() => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year - 1);
    onDateChange(newDate);
  }, [currentDate, year, onDateChange]);

  const handleZoomIn = useCallback(() => onViewModeChange('month', 'out'), [onViewModeChange]);

  useGestureNavigation(containerRef, {
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onZoomIn: handleZoomIn,
  });

  const handleMonthClick = useCallback((monthDate: Date) => {
    onDateChange(monthDate);
    onViewModeChange('month', undefined);
  }, [onDateChange, onViewModeChange]);

  const months = useMemo(() => getMonthsInYear(year), [year]);

  return (
    <div ref={containerRef} data-zoom-container className="calendar-container">
      <div className="grid-responsive-3-4-6 gap-4 sm:gap-6 lg:gap-8">
        {months.map((monthDate) => (
          <MiniMonth
            key={monthDate.getMonth()}
            monthDate={monthDate}
            entries={entries}
            settings={settings}
            onMonthClick={handleMonthClick}
          />
        ))}
      </div>
    </div>
  );
});
