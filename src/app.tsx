import React, {,
  useState,
  useEffect,
  useMemo,
  useCallback,
  lazy,
  Suspense,
  useRef,
} from 'react';
import { createRoot } from 'react-dom/client';
import { AppHeader } from './Header';
import { Diary } from './Diary';
import { MoodEntry, ViewMode, Settings, DEFAULT_SETTINGS } from './types';
import { useLocalStorage } from './hooks';
import {
  formatDate,
  getValidEntries,
  getCalendarIconSvg,
  calculateGradientColors,
} from './utils';
import './styles.css';

const ViewMonth = lazy(() =>
  import('./ViewModes').then((module) => ({ default: module.ViewMonth }))
);
const ViewYear = lazy(() =>
  import('./ViewModes').then((module) => ({ default: module.ViewYear }))
);
const ViewDay = lazy(() =>
  import('./ViewModes').then((module) => ({ default: module.ViewDay }))
);
const SettingsModal = lazy(() =>
  import('./Settings').then((module) => ({ default: module.SettingsModal }))
);

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [entries, setEntries] = useLocalStorage<MoodEntry[]>(
    'mood-entries',
    []
  );
  const [settings, setSettings] = useLocalStorage<Settings>(
    'mood-settings',
    DEFAULT_SETTINGS
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!settings.customLabels) {
      setSettings({ ...settings, customLabels: DEFAULT_SETTINGS.customLabels });
    }
  }, []);

  const showStatusMessage = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      setStatusMessage({ text: message, type });
      statusTimeoutRef.current = setTimeout(() => setStatusMessage(null), 3000);
    },
    []
  );
  useEffect(() => {
    const root = document.documentElement;
    const { customColors } = settings;

    root.style.setProperty('--color-base-bg', customColors.base);
    root.style.setProperty('--color-accent', customColors.accent);
    root.style.setProperty('--color-text', customColors.text);
    root.style.setProperty(
      '--calendar-icon-svg',
      getCalendarIconSvg(customColors.text)
    );

    const gradientColors = calculateGradientColors(customColors.base);
    root.style.setProperty('--gradient-from', gradientColors.from);
    root.style.setProperty('--gradient-via', gradientColors.via);
    root.style.setProperty('--gradient-to', gradientColors.to);

    Object.entries(customColors.moods).forEach(([mood, color]) => {
      root.style.setProperty(`--color-mood-${mood}`, color);
    });

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', customColors.base);
    }
  }, [
    settings.customColors.base,
    settings.customColors.accent,
    settings.customColors.text,
    settings.customColors.moods,
  ]);

  useEffect(() => {
    const body = document.body;

    if (settings.backgroundImage) {
      body.style.setProperty(
        'background-image',
        `url(${settings.backgroundImage})`,
        'important'
      );
      body.style.setProperty('background-size', 'cover', 'important');
      body.style.setProperty('background-position', 'center', 'important');
      body.style.setProperty('background-attachment', 'fixed', 'important');
    } else {
      body.style.removeProperty('background-image');
      body.style.removeProperty('background-size');
      body.style.removeProperty('background-position');
      body.style.removeProperty('background-attachment');
    }
  }, [settings.backgroundImage]);

  const handleSaveEntry = useCallback(
    (entry: MoodEntry) => {
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.date !== entry.date);
        if (entry.mood === 'grey' && !entry.diary.trim()) {
          return filtered;
        }
        return [...filtered, entry];
      });
    },
    [setEntries]
  );

  const currentEntry = useMemo(
    () =>
      selectedDate
        ? entries.find((e) => e.date === formatDate(selectedDate))
        : undefined,
    [selectedDate, entries]
  );

  const handleEntryClick = useCallback((entry: MoodEntry) => {
    const [year, month, day] = entry.date.split('-').map(Number);
    setSelectedDate(new Date(year, month - 1, day));
  }, []);
  const validEntries = useMemo(() => getValidEntries(entries), [entries]);

  const backgroundClass = useMemo(() => {
    if (settings.backgroundImage) return '';
    return 'bg-dynamic-gradient';
  }, [settings.backgroundImage]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.backgroundColor && !settings.backgroundImage) {
      const gradientColors = calculateGradientColors(settings.backgroundColor);
      root.style.setProperty('--gradient-from', gradientColors.from);
      root.style.setProperty('--gradient-via', gradientColors.via);
      root.style.setProperty('--gradient-to', gradientColors.to);
    } else if (!settings.backgroundImage) {
      const gradientColors = calculateGradientColors(
        settings.customColors.base
      );
      root.style.setProperty('--gradient-from', gradientColors.from);
      root.style.setProperty('--gradient-via', gradientColors.via);
      root.style.setProperty('--gradient-to', gradientColors.to);
    }
  }, [
    settings.backgroundColor,
    settings.backgroundImage,
    settings.customColors.base,
  ]);

  return (
    <div
      className={`min-h-screen h-full transition-colors duration-300 ${
        settings.isDarkMode ? 'dark' : 'light-mode'
      } ${backgroundClass}`}
      style={
        {
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties
      }
    >
      <div
        className="container mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-6 lg:py-8 max-w-7xl"
        style={
          {
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
          } as React.CSSProperties
        }
      >
        <AppHeader
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onSettingsClick={() => setIsSettingsOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          settings={settings}
        />

        <main className="space-y-3 sm:space-y-6">
          <Suspense
            fallback={
              <div className="flex-center min-h-[400px]">
                <div className="text-responsive-base opacity-70">
                  Loading...
                </div>
              </div>
            }
          >
            {viewMode === 'month' && (
              <ViewMonth
                currentDate={currentDate}
                entries={entries}
                onEntryEdit={setSelectedDate}
                onDateChange={setCurrentDate}
                onViewModeChange={setViewMode}
                settings={settings}
              />
            )}

            {viewMode === 'year' && (
              <ViewYear
                currentDate={currentDate}
                entries={entries}
                onDateChange={setCurrentDate}
                onViewModeChange={setViewMode}
                settings={settings}
              />
            )}

            {viewMode === 'day' && (
              <ViewDay
                entries={validEntries}
                onEntryClick={handleEntryClick}
                searchQuery={searchQuery}
                settings={settings}
                onViewModeChange={setViewMode}
              />
            )}
          </Suspense>
        </main>

        <Diary
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          date={selectedDate || new Date()}
          entry={currentEntry}
          onSave={handleSaveEntry}
          settings={settings}
        />

        <Suspense fallback={null}>
          {isSettingsOpen && (
            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              settings={settings}
              onSettingsChange={setSettings}
              entries={entries}
              setEntries={setEntries}
              onDeleteAllData={() => setEntries([])}
              showStatusMessage={showStatusMessage}
            />
          )}
        </Suspense>

        {statusMessage && (
          <div
            className={`status-message ${
              statusMessage.type === 'error' ? 'status-error' : 'status-success'
            }`}
          >
            {statusMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
