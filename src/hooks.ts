import { useState, useRef, useEffect, useCallback } from 'react';

export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      const parsedValue = JSON.parse(item);
      if (Array.isArray(initialValue) && Array.isArray(parsedValue)) {
        return parsedValue;
      }
      if (typeof initialValue === 'object' && typeof parsedValue === 'object') {
        return { ...initialValue, ...parsedValue };
      }
      return parsedValue;
    } catch {
      window.localStorage.removeItem(key);
      return initialValue;
    }
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingValueRef = useRef<T | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        if (pendingValueRef.current !== null) {
          try {
            window.localStorage.setItem(key, JSON.stringify(pendingValueRef.current));
          } catch {}
        }
      }
    };
  }, [key]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const newValue = typeof value === 'function' ? (value as (prev: T) => T)(storedValue) : value;
      setStoredValue(newValue);
      pendingValueRef.current = newValue;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        try {
          window.localStorage.setItem(key, JSON.stringify(newValue));
          pendingValueRef.current = null;
        } catch (error) {
          if (error instanceof Error && error.name === 'QuotaExceededError') {
            console.error('Storage quota exceeded');
          }
        }
      }, 100);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please clear some data or use smaller images.');
      }
      throw error;
    }
  }, [storedValue, key]);

  return [storedValue, setValue];
};

export const useHistory = <T>(initialState: T, maxHistorySize = 20) => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUpdatingFromHistory = useRef(false);

  const addToHistory = useCallback((state: T) => {
    if (isUpdatingFromHistory.current) {
      isUpdatingFromHistory.current = false;
      return;
    }

    setHistory(prev => {
      const currentIndex = historyIndex;
      if (JSON.stringify(prev[currentIndex]) === JSON.stringify(state)) {
        return prev;
      }

      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(state);

      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return newHistory;
      }

      setHistoryIndex(currentIndex + 1);
      return newHistory;
    });
  }, [historyIndex, maxHistorySize]);

  const undo = useCallback((): T | null => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      isUpdatingFromHistory.current = true;
      setHistoryIndex(newIndex);
      return history[newIndex] || null;
    }
    return null;
  }, [historyIndex, history]);

  const redo = useCallback((): T | null => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      isUpdatingFromHistory.current = true;
      setHistoryIndex(newIndex);
      return history[newIndex] || null;
    }
    return null;
  }, [historyIndex, history]);

  return {
    addToHistory,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
};

export const useGestureNavigation = (
  elementRef: React.RefObject<HTMLElement>,
  callbacks: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    swipeThreshold?: number;
    enabled?: boolean;
  }
) => {
  const startX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const initialDistance = useRef<number>(0);
  const isGesturing = useRef<boolean>(false);
  const gestureTimeout = useRef<NodeJS.Timeout | null>(null);

  const {
    onSwipeLeft,
    onSwipeRight,
    onZoomIn,
    onZoomOut,
    swipeThreshold = 50,
    enabled = true,
  } = callbacks;

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    const getDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      const touch1 = touches[0];
      const touch2 = touches[1];

      return Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
      );
    };

    const touchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startX.current = e.touches[0].clientX;
        isDragging.current = false;
      } else if (e.touches.length === 2) {
        initialDistance.current = getDistance(e.touches);
        isGesturing.current = true;
      }
    };

    const touchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && !isDragging.current && Math.abs(e.touches[0].clientX - startX.current) > 10) {
        isDragging.current = true;
      } else if (e.touches.length === 2 && isGesturing.current) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        const threshold = 80;

        if (currentDistance - initialDistance.current > threshold && !gestureTimeout.current) {
          onZoomIn?.();
          isGesturing.current = false;
          gestureTimeout.current = setTimeout(() => {
            gestureTimeout.current = null;
          }, 800);
        } else if (initialDistance.current - currentDistance > threshold && !gestureTimeout.current) {
          onZoomOut?.();
          isGesturing.current = false;
          gestureTimeout.current = setTimeout(() => {
            gestureTimeout.current = null;
          }, 800);
        }
      }
    };

    const touchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        if (isDragging.current) {
          const deltaX = startX.current - e.changedTouches[0].clientX;
          if (Math.abs(deltaX) > swipeThreshold) {
            if (deltaX > 0 && onSwipeLeft) onSwipeLeft();
            else if (deltaX < 0 && onSwipeRight) onSwipeRight();
          }
        }
        isDragging.current = false;
        isGesturing.current = false;
        initialDistance.current = 0;
      }
    };

    const mouseDown = (e: MouseEvent) => {
      startX.current = e.clientX;
      isDragging.current = false;
    };

    const mouseMove = (e: MouseEvent) => {
      if (e.buttons === 1 && !isDragging.current && Math.abs(e.clientX - startX.current) > 10) {
        isDragging.current = true;
      }
    };

    const mouseUp = (e: MouseEvent) => {
      if (isDragging.current) {
        const deltaX = startX.current - e.clientX;
        if (Math.abs(deltaX) > swipeThreshold) {
          if (deltaX > 0 && onSwipeLeft) onSwipeLeft();
          else if (deltaX < 0 && onSwipeRight) onSwipeRight();
        }
      }
      isDragging.current = false;
    };

    element.addEventListener('touchstart', touchStart, { passive: false });
    element.addEventListener('touchmove', touchMove, { passive: false });
    element.addEventListener('touchend', touchEnd);
    element.addEventListener('mousedown', mouseDown);
    element.addEventListener('mousemove', mouseMove);
    element.addEventListener('mouseup', mouseUp);

    return () => {
      if (gestureTimeout.current) clearTimeout(gestureTimeout.current);
      element.removeEventListener('touchstart', touchStart);
      element.removeEventListener('touchmove', touchMove);
      element.removeEventListener('touchend', touchEnd);
      element.removeEventListener('mousedown', mouseDown);
      element.removeEventListener('mousemove', mouseMove);
      element.removeEventListener('mouseup', mouseUp);
    };
  }, [elementRef, onSwipeLeft, onSwipeRight, onZoomIn, onZoomOut, swipeThreshold, enabled]);
};
