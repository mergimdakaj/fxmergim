import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against unhandled cross-origin script errors and resize observer loop notices
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg === 'Script error.' ||
      msg.includes('ResizeObserver loop') ||
      msg.includes('ResizeObserver') ||
      msg.includes('Script error')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (
      msg.includes('Script error') ||
      msg.includes('ResizeObserver') ||
      reason?.name === 'SecurityError'
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Captured in RootErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090d16] text-slate-200 flex flex-col items-center justify-center p-6 text-center">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 max-w-md w-full">
            <h2 className="text-xl font-bold text-amber-400 mb-2">Ndodhi një rifreskim i aplikacionit</h2>
            <p className="text-sm text-slate-400 mb-4">
              Një komponent pati një ndërprerje të përkohshme. Shtypni butonin më poshtë për të rifilluar platformën normalisht.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all cursor-pointer"
            >
              Rifresko Platformën
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);

