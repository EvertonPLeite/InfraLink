import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Toaster 
        theme="dark" 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#111',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            borderRadius: '1rem',
            fontFamily: 'Instrument Sans, sans-serif'
          },
        }}
      />
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
