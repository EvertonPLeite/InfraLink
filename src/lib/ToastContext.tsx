import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto hide after 5 seconds
    setTimeout(() => {
      hideToast(id);
    }, 5000);
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none max-w-md w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, scale: 0.8, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
              className="pointer-events-auto"
            >
              <div className={`
                relative overflow-hidden p-4 rounded-2xl border flex items-center gap-4 shadow-2xl backdrop-blur-xl
                ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-100' : ''}
                ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100' : ''}
                ${toast.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-100' : ''}
                ${toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-100' : ''}
              `}>
                {/* Glow Effect */}
                <div className={`absolute -inset-px opacity-20 pointer-events-none 
                  ${toast.type === 'error' ? 'bg-red-500' : ''}
                  ${toast.type === 'success' ? 'bg-emerald-500' : ''}
                  ${toast.type === 'info' ? 'bg-blue-500' : ''}
                  ${toast.type === 'warning' ? 'bg-amber-500' : ''}
                `} />

                <div className={`p-2 rounded-xl shrink-0
                  ${toast.type === 'error' ? 'bg-red-500/20 text-red-500' : ''}
                  ${toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' : ''}
                  ${toast.type === 'info' ? 'bg-blue-500/20 text-blue-500' : ''}
                  ${toast.type === 'warning' ? 'bg-amber-500/20 text-amber-500' : ''}
                `}>
                  {toast.type === 'error' && <AlertCircle size={20} />}
                  {toast.type === 'success' && <CheckCircle2 size={20} />}
                  {toast.type === 'info' && <Info size={20} />}
                  {toast.type === 'warning' && <AlertTriangle size={20} />}
                </div>

                <div className="flex-grow py-1">
                  <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
                </div>

                <button 
                  onClick={() => hideToast(toast.id)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                >
                  <X size={16} />
                </button>
                
                {/* Progress Bar Animation */}
                <motion.div 
                  className={`absolute bottom-0 left-0 h-0.5 
                    ${toast.type === 'error' ? 'bg-red-500' : ''}
                    ${toast.type === 'success' ? 'bg-emerald-500' : ''}
                    ${toast.type === 'info' ? 'bg-blue-500' : ''}
                    ${toast.type === 'warning' ? 'bg-amber-500' : ''}
                  `}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
