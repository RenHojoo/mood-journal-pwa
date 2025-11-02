import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Grid3x3, List, Settings as SettingsIcon, Search } from 'lucide-react';
import { ViewMode, Settings } from './types';
import { addMonths } from './utils';
import { Button, IconButton, Modal } from './components';

const VIEW_MODE_CONFIG = {
  day: { icon: List, title: 'Day View' },
  month: { icon: Calendar, title: 'Month View' },
  year: { icon: Grid3x3, title: 'Year View' },
} as const;

const SearchInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  settings: Settings;
}> = React.memo(({ value, onChange, settings }) => (
  <div className="search-container">
    <Search size={18} className="icon-md flex-shrink-0" style={{ color: settings.customColors.accent }} />
    <input
      type="text"
      placeholder="Search..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="search-input"
      style={{ color: settings.customColors.text, '--tw-placeholder-color': settings.customColors.text } as React.CSSProperties}
    />
  </div>
));

const ViewModeToggle: React.FC<{
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  settings: Settings;
}> = React.memo(({ currentMode, onModeChange, settings }) => (
  <div className="view-mode-toggle">
    {Object.entries(VIEW_MODE_CONFIG).map(([mode, config]) => {
      const isActive = currentMode === mode;
      const IconComponent = config.icon;
      return (
        <button
          key={mode}
          onClick={() => onModeChange(mode as ViewMode)}
          className={`view-mode-button ${isActive ? 'view-mode-button-active' : 'view-mode-button-inactive'}`}
          title={config.title}
        >
          <IconComponent
            size={16}
            className="sm:w-5 sm:h-5 md:w-6 md:h-6"
            style={{ color: isActive ? settings.customColors.accent : settings.customColors.text }}
          />
        </button>
      );
    })}
  </div>
));

const DateNavigation: React.FC<{
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: ViewMode;
  settings: Settings;
}> = ({ currentDate, onDateChange, viewMode, settings }) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [tempYear, setTempYear] = useState('');

  const navigateDate = (direction: number) => {
    if (viewMode === 'year') {
      const newDate = new Date(currentDate);
      newDate.setFullYear(newDate.getFullYear() + direction);
      onDateChange(newDate);
    } else {
      onDateChange(addMonths(currentDate, direction));
    }
  };

  const handleDateClick = () => {
    if (viewMode === 'month') {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      setTempDate(`${year}-${month}`);
      setIsDatePickerOpen(true);
    } else if (viewMode === 'year') {
      setTempYear(String(currentDate.getFullYear()));
      setIsYearPickerOpen(true);
    }
  };

  const handleDateSubmit = () => {
    if (viewMode === 'month' && tempDate) {
      const [year, month] = tempDate.split('-').map(Number);
      const newDate = new Date(year, month - 1, 1);
      if (!isNaN(newDate.getTime())) {
        onDateChange(newDate);
      }
      setIsDatePickerOpen(false);
    } else if (viewMode === 'year' && tempYear) {
      const year = parseInt(tempYear);
      if (!isNaN(year)) {
        const newDate = new Date(currentDate);
        newDate.setFullYear(year);
        onDateChange(newDate);
      }
      setIsYearPickerOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDateSubmit();
    } else if (e.key === 'Escape') {
      setIsDatePickerOpen(false);
      setIsYearPickerOpen(false);
    }
  };

  const titleContent = viewMode === 'year' ? (
    <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold">
      {currentDate.getFullYear()}
    </span>
  ) : viewMode === 'day' ? (
    <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold">All Entries</span>
  ) : (
    <div className="flex flex-col items-center">
      <span className="text-sm sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold leading-tight">
        {currentDate.toLocaleDateString(undefined, { month: 'long' })}
      </span>
      <span className="text-xs sm:text-sm md:text-base lg:text-lg opacity-70 leading-tight">
        {currentDate.getFullYear()}
      </span>
    </div>
  );

  const showNavigation = viewMode !== 'day';

  return (
    <>
      <div className="nav-container">
        {showNavigation && (
          <IconButton
            icon={<ChevronLeft size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7" />}
            onClick={() => navigateDate(-1)}
            size="lg"
          />
        )}

        <div className="nav-center">
          <button
            onClick={handleDateClick}
            className="hover:opacity-80 transition-colors cursor-pointer text-center"
            style={{ color: settings.customColors.text }}
            disabled={viewMode === 'day'}
          >
            {titleContent}
          </button>
        </div>

        {showNavigation && (
          <IconButton
            icon={<ChevronRight size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7" />}
            onClick={() => navigateDate(1)}
            size="lg"
          />
        )}
      </div>

      <Modal isOpen={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} size="sm" showCloseButton={false}>
        <input
          type="month"
          value={tempDate}
          onChange={(e) => setTempDate(e.target.value)}
          onKeyDown={handleKeyPress}
          className="input-base mb-4"
          style={{
            color: settings.customColors.text,
          }}
          autoFocus
        />
        <div className="flex gap-3 w-full">
          <Button variant="secondary" onClick={() => setIsDatePickerOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleDateSubmit} accentColor={settings.customColors.accent} className="flex-1">
            Go
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isYearPickerOpen} onClose={() => setIsYearPickerOpen(false)} size="sm" showCloseButton={false}>
        <input
          type="number"
          value={tempYear}
          onChange={(e) => setTempYear(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Enter year (e.g., 2025)"
          className="input-base mb-4"
          style={{ color: settings.customColors.text } as React.CSSProperties}
          autoFocus
        />
        <div className="flex gap-3 w-full">
          <Button variant="secondary" onClick={() => setIsYearPickerOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleDateSubmit} accentColor={settings.customColors.accent} className="flex-1">
            Go
          </Button>
        </div>
      </Modal>
    </>
  );
};

export const AppHeader: React.FC<{
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSettingsClick: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  settings: Settings;
}> = ({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  onSettingsClick,
  searchQuery = '',
  onSearchChange,
  settings,
}) => (
  <header className="card-base p-responsive-lg mb-3 sm:mb-6">
    <div className="flex-between gap-responsive-md min-w-0">
      {viewMode === 'day' ? (
        <SearchInput value={searchQuery} onChange={onSearchChange || (() => {})} settings={settings} />
      ) : (
        <DateNavigation currentDate={currentDate} onDateChange={onDateChange} viewMode={viewMode} settings={settings} />
      )}

      <div className="nav-button-group">
        <ViewModeToggle currentMode={viewMode} onModeChange={onViewModeChange} settings={settings} />
        <IconButton
          icon={<SettingsIcon size={18} className="icon-md" style={{ color: settings.customColors.text }} />}
          onClick={onSettingsClick}
          title="Settings"
        />
      </div>
    </div>
  </header>
);
