'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success';
}

interface ToastContextType {
  showToast: (message: string, type?: 'info' | 'success') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'info' | 'success' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg backdrop-blur-sm',
              'bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800',
              'text-sm text-zinc-900 dark:text-zinc-100',
              'pointer-events-auto toast-enter'
            )}
          >
            {toast.type === 'success' ? (
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

