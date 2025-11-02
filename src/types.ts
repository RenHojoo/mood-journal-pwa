export interface MoodEntry {
  date: string; // YYYY-MM-DD
  mood: MoodColor;
  diary: string;
}

export type MoodColor = 'grey' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
export type ViewMode = 'month' | 'year' | 'day';

export interface Settings {
  customColors: {
    base: string;
    accent: string;
    text: string;
    moods: Record<MoodColor, string>;
  };
  customLabels: Record<MoodColor, string>;
  backgroundImage?: string;
  backgroundColor?: string;
  isDarkMode: boolean;
}

// Constants
export const MOOD_COLORS: readonly MoodColor[] = ['grey', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'];

export const MOOD_EMOJIS: Record<MoodColor, string> = {
  grey: '⚪',
  red: '🔴',
  orange: '🟠',
  yellow: '🟡',
  green: '🟢',
  blue: '🔵',
  purple: '🟣',
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DEFAULT_SETTINGS: Settings = {
  customColors: {
    base: '#1e1e1e',
    accent: '#d66a8c',
    text: '#bababa',
    moods: {
      grey: '#78716c',
      red: '#a63939',
      orange: '#c25e28',
      yellow: '#a98d00',
      green: '#5b7d2a',
      blue: '#2b748d',
      purple: '#764398',
    },
  },
  customLabels: {
    grey: 'No Mood',
    red: 'Terrible',
    orange: 'Bad',
    yellow: 'Okay',
    green: 'Good',
    blue: 'Great',
    purple: 'Amazing',
  },
  isDarkMode: true,
};