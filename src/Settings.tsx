import React, { useState, useCallback, useMemo } from 'react';
import { Download, Upload, Trash2, Image, RotateCcw, Sun, Moon } from 'lucide-react';
import { MoodEntry, Settings, DEFAULT_SETTINGS } from './types';
import { Modal, Button } from './components';
import { exportData, importData, getValidEntries, compressImage } from './utils';

export const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  entries: MoodEntry[];
  setEntries: React.Dispatch<React.SetStateAction<MoodEntry[]>>;
  onDeleteAllData: () => void;
  showStatusMessage: (message: string, type?: 'success' | 'error') => void;
}> = ({ isOpen, onClose, settings, onSettingsChange, entries, setEntries, onDeleteAllData, showStatusMessage }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const [tempColor, setTempColor] = useState<string>('#000000');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [tempLabel, setTempLabel] = useState<string>('');

  const handleExport = useCallback(() => {
    const validEntries = getValidEntries(entries);
    if (validEntries.length === 0) {
      showStatusMessage('No entries to export.', 'error');
      return;
    }

    const blob = new Blob([exportData(entries)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    a.download = `moodjournal-${year}-${month}-${day}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatusMessage(`Exported ${validEntries.length} entries.`);
  }, [entries, showStatusMessage]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.txt')) {
        showStatusMessage('Please select a .txt file.', 'error');
        event.target.value = '';
        return;
      }

      if (file.size > 1024 * 1024) {
        showStatusMessage('File too large. Please use a file smaller than 1MB.', 'error');
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importedEntries = importData(content);

          setEntries((prev) => {
            const existingDates = new Set(importedEntries.map((e) => e.date));
            const filtered = prev.filter((e) => !existingDates.has(e.date));
            return [...filtered, ...importedEntries];
          });

          showStatusMessage(`Imported ${importedEntries.length} entries.`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Import failed.';
          showStatusMessage(`Import failed: ${errorMessage}`, 'error');
        }
      };

      reader.onerror = () => showStatusMessage('Error reading file. Please try again.', 'error');
      reader.readAsText(file);
      setShowImportConfirm(false);
      event.target.value = '';
    },
    [setEntries, showStatusMessage]
  );

  const confirmImport = useCallback(() => {
    const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
    fileInput?.click();
  }, []);

  const handleDeleteAll = useCallback(() => {
    onDeleteAllData();
    setShowDeleteConfirm(false);
    showStatusMessage('All entries deleted.');
  }, [onDeleteAllData, showStatusMessage]);

  const updateColor = useCallback(
    (colorKey: string, color: string) => {
      if (colorKey === 'base' || colorKey === 'accent' || colorKey === 'text') {
        onSettingsChange({
          ...settings,
          customColors: { ...settings.customColors, [colorKey]: color },
        });
      } else {
        onSettingsChange({
          ...settings,
          customColors: {
            ...settings.customColors,
            moods: { ...settings.customColors.moods, [colorKey]: color },
          },
        });
      }
    },
    [settings, onSettingsChange]
  );

  const setBackgroundColor = useCallback(
    (color: string) => {
      onSettingsChange({
        ...settings,
        backgroundColor: color,
      });
    },
    [settings, onSettingsChange]
  );

  const removeBackground = useCallback(() => {
    onSettingsChange({
      ...settings,
      backgroundImage: undefined,
    });
  }, [settings, onSettingsChange]);

  const resetTheme = useCallback(() => {
    onSettingsChange({
      ...settings,
      customColors: DEFAULT_SETTINGS.customColors,
      customLabels: DEFAULT_SETTINGS.customLabels,
      backgroundImage: undefined,
      backgroundColor: undefined,
    });
    setActiveColorPicker(null);
  }, [settings, onSettingsChange]);

  const openColorPicker = useCallback(
    (colorKey: string) => {
      const currentColor =
        colorKey === 'background'
          ? settings.backgroundColor || settings.customColors.base
          : colorKey === 'base' || colorKey === 'accent' || colorKey === 'text'
          ? (settings.customColors[colorKey as keyof typeof settings.customColors] as string)
          : settings.customColors.moods[colorKey as keyof typeof settings.customColors.moods];

      setTempColor(currentColor);
      setActiveColorPicker(colorKey);
      setIsEditingLabel(false);

      if (colorKey !== 'background' && colorKey !== 'base' && colorKey !== 'accent' && colorKey !== 'text') {
        setTempLabel(settings.customLabels[colorKey as MoodColor]);
      }
    },
    [settings]
  );

  const applyColor = useCallback(() => {
    if (!activeColorPicker) return;

    if (activeColorPicker === 'background') {
      setBackgroundColor(tempColor);
    } else {
      updateColor(activeColorPicker, tempColor);
    }
    setActiveColorPicker(null);
  }, [activeColorPicker, tempColor, setBackgroundColor, updateColor]);

  const handleBackgroundImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        showStatusMessage('Image too large. Please use an image smaller than 10MB.', 'error');
        event.target.value = '';
        return;
      }

      if (!file.type.startsWith('image/')) {
        showStatusMessage('Please select a valid image file.', 'error');
        event.target.value = '';
        return;
      }

      try {
        const compressedDataUrl = await compressImage(file, 1920, 1080, 0.85);

        if (compressedDataUrl.length > 5 * 1024 * 1024) {
          showStatusMessage('Compressed image still too large. Please use a smaller image.', 'error');
          event.target.value = '';
          return;
        }

        onSettingsChange({
          ...settings,
          backgroundImage: compressedDataUrl,
        });
        showStatusMessage('Background image updated.');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error processing image';
        showStatusMessage(`${errorMessage}. Please try again.`, 'error');
      }

      event.target.value = '';
    },
    [settings, onSettingsChange, showStatusMessage]
  );

  const colorPickerTitle = useMemo(() => {
    if (!activeColorPicker) return '';
    const titles: Record<string, string> = {
      background: 'Background',
      base: 'Base',
      accent: 'Accent',
      text: 'Text',
    };
    return titles[activeColorPicker] || settings.customLabels[activeColorPicker as MoodColor];
  }, [activeColorPicker, settings.customLabels]);

  const updateLabel = useCallback(
    (moodKey: MoodColor, label: string) => {
      onSettingsChange({
        ...settings,
        customLabels: { ...settings.customLabels, [moodKey]: label },
      });
    },
    [settings, onSettingsChange]
  );

  const handleLabelClick = useCallback(() => {
    if (activeColorPicker && activeColorPicker !== 'background' && activeColorPicker !== 'base' && activeColorPicker !== 'accent' && activeColorPicker !== 'text') {
      setIsEditingLabel(true);
    }
  }, [activeColorPicker]);

  const handleLabelSubmit = useCallback(() => {
    if (activeColorPicker && tempLabel.trim()) {
      updateLabel(activeColorPicker as MoodColor, tempLabel.trim());
    }
    setIsEditingLabel(false);
  }, [activeColorPicker, tempLabel, updateLabel]);

  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLabelSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingLabel(false);
      if (activeColorPicker) {
        setTempLabel(settings.customLabels[activeColorPicker as MoodColor]);
      }
    }
  }, [handleLabelSubmit, activeColorPicker, settings.customLabels]);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <div className="space-responsive-md">
          <div>
            <div className="settings-theme-row">
              <h3 className="section-title">Theme Colors</h3>

              <button
                onClick={() => onSettingsChange({ ...settings, isDarkMode: !settings.isDarkMode })}
                className="theme-toggle"
              >
                <div
                  className={`theme-toggle-slider ${settings.isDarkMode ? 'theme-toggle-active' : ''}`}
                  style={{ backgroundColor: settings.customColors.accent }}
                >
                  {settings.isDarkMode ? <Sun size={12} /> : <Moon size={12} />}
                </div>
              </button>

              <button onClick={resetTheme} className="settings-reset-button">
                <RotateCcw size={12} />
                Reset
              </button>
            </div>

            <div className="flex justify-center mb-3">
              <div className="color-grid-main">
                <button
                  onClick={() => openColorPicker('base')}
                  className="color-button"
                  style={{ backgroundColor: settings.customColors.base }}
                  title="Base Color"
                />
                <button
                  onClick={() => openColorPicker('accent')}
                  className="color-button"
                  style={{ backgroundColor: settings.customColors.accent }}
                  title="Accent Color"
                />
                <button
                  onClick={() => openColorPicker('background')}
                  className="color-button cursor-pointer flex-center bg-white/10"
                  title="Background Color"
                >
                  <Image size={12} style={{ color: '#bababa' }} />
                </button>
                <button
                  onClick={() => openColorPicker('text')}
                  className="color-button flex-center text-lg font-bold"
                  style={{ fontSize: '24px', fontFamily: 'Georgia', color: settings.customColors.text }}
                  title="Text Color"
                >
                  A
                </button>
              </div>
            </div>

            <div className="color-grid-moods">
              {Object.entries(settings.customColors.moods).map(([mood, color]) => (
                <button
                  key={mood}
                  onClick={() => openColorPicker(mood)}
                  className="color-button-mood"
                  style={{ backgroundColor: color }}
                  title={settings.customLabels[mood as MoodColor]}
                />
              ))}
            </div>
          </div>

          <div className="settings-section">
            <h3 className="section-title mb-3">Data Management</h3>

            <div className="settings-data-section">
              <Button variant="secondary" onClick={handleExport} className="w-full flex items-center gap-2 justify-center">
                <Download size={16} />
                Export Data
              </Button>

              <Button variant="secondary" onClick={() => setShowImportConfirm(true)} className="w-full flex-center gap-2">
                <Upload size={16} />
                Import Data
              </Button>

              <input
                id="import-file-input"
                type="file"
                accept=".txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          <div className="settings-section">
            <Button
              variant="primary"
              onClick={() => setShowDeleteConfirm(true)}
              accentColor={settings.customColors.accent}
              className="w-full flex-center gap-2"
            >
              <Trash2 size={16} />
              Delete Data
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!activeColorPicker} onClose={() => setActiveColorPicker(null)} size="sm" showCloseButton={false}>
        <div className="color-picker-container">
          <div className="color-picker-title">Mood Label</div>
          {isEditingLabel ? (
            <div className="color-picker-label-wrapper">
              <input
                type="text"
                value={tempLabel}
                onChange={(e) => setTempLabel(e.target.value)}
                onBlur={handleLabelSubmit}
                onKeyDown={handleLabelKeyDown}
                className="color-picker-label-input"
                autoFocus
                maxLength={20}
              />
            </div>
          ) : (
            <div
              className="color-picker-subtitle"
              onClick={handleLabelClick}
              style={{ cursor: activeColorPicker && activeColorPicker !== 'background' && activeColorPicker !== 'base' && activeColorPicker !== 'accent' && activeColorPicker !== 'text' ? 'pointer' : 'default' }}
            >
              {colorPickerTitle}
            </div>
          )}
        </div>

        <div className="color-picker-display">
          <input type="color" value={tempColor} onChange={(e) => setTempColor(e.target.value)} className="color-picker-native" />
        </div>

        <div className="color-picker-input-row">
          <div className="color-picker-preview" style={{ backgroundColor: tempColor }} />
          <input
            type="text"
            value={tempColor}
            onChange={(e) => setTempColor(e.target.value)}
            className="color-picker-text-input"
          />
        </div>

        {activeColorPicker === 'background' && (
          <div className="color-picker-upload-section">
            <label className="color-picker-upload-button">
              <Upload size={16} />
              Upload Image
              <input type="file" accept="image/*" onChange={handleBackgroundImageUpload} className="hidden" />
            </label>

            {settings.backgroundImage && (
              <div className="flex justify-center">
                <button onClick={removeBackground} className="color-picker-remove-button" style={{ opacity: 0.7 }}>
                  Remove Background
                </button>
              </div>
            )}
          </div>
        )}

        <div className="modal-footer">
          <Button variant="secondary" onClick={() => setActiveColorPicker(null)} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={applyColor} accentColor={settings.customColors.accent} className="flex-1">
            Apply
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} size="md" showCloseButton={false}>
        <div className="confirm-modal-content">
          <div className="confirm-modal-icon">⚠️</div>
          <h3 className="confirm-modal-title">Delete All Data?</h3>
          <p className="confirm-modal-description">
            All your entries will be permanently deleted from this device. This action cannot be undone (make sure to
            export a backup)!
          </p>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDeleteAll}
            accentColor={settings.customColors.accent}
            className="flex-1"
          >
            Delete All
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showImportConfirm} onClose={() => setShowImportConfirm(false)} size="md" showCloseButton={false}>
        <div className="confirm-modal-content">
          <div className="confirm-modal-icon">📁</div>
          <h3 className="confirm-modal-title">Import .TXT File?</h3>
          <p className="confirm-modal-description">
            Select a .txt file from this device. Entries with the same date will be replaced. This action cannot be
            undone.
          </p>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={() => setShowImportConfirm(false)} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmImport} accentColor={settings.customColors.accent} className="flex-1">
            Select File
          </Button>
        </div>
      </Modal>
    </>
  );
};
