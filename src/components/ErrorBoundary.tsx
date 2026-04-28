import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('App Crash:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-black flex items-center justify-center p-8 text-center">
          <div className="glass-panel p-12 rounded-[3rem] border-red-500/20 max-w-lg">
            <h1 className="text-4xl font-black tracking-tighter mb-6 underline decoration-red-500">Ops! Algo deu errado.</h1>
            <p className="text-white/40 mb-8 font-medium">Ocorreu um erro inesperado na interface. Tente recarregar a página.</p>
            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 mb-8 text-left overflow-auto max-h-40">
              <code className="text-xs text-red-400 font-mono">{this.state.error?.toString() || 'Erro desconhecido'}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-brand-neon text-brand-black px-10 py-5 rounded-2xl font-bold hover:scale-105 transition-all"
            >
              Recarregar Painel
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
