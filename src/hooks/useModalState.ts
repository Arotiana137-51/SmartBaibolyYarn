// src/hooks/useModalState.ts
import { useState, useCallback } from 'react';

export interface UseModalStateReturn<T = any> {
  visible: boolean;
  data: T | null;
  open: (data?: T) => void;
  close: () => void;
  toggle: () => void;
}

export function useModalState<T = any>(initialData: T | null = null): UseModalStateReturn<T> {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<T | null>(initialData);

  const open = useCallback((modalData?: T) => {
    if (modalData !== undefined) {
      setData(modalData);
    }
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    // Optionally reset data after closing
    setTimeout(() => setData(initialData), 300);
  }, [initialData]);

  const toggle = useCallback(() => {
    setVisible(prev => !prev);
  }, []);

  return {
    visible,
    data,
    open,
    close,
    toggle,
  };
}
