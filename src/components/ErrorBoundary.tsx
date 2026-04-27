import React from 'react';
import { AlertTriangle, Home, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 text-white font-sans">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-[#111] border border-white/10 rounded-[3rem] p-12 text-center"
          >
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-3xl font-black tracking-tighter mb-4 uppercase">
              Ops! Algo deu <span className="text-red-500">errado</span>
            </h1>
            
            <p className="text-white/40 text-sm mb-8">
              O sistema encontrou um erro inesperado. Tentamos manter tudo funcionando, mas desta vez não foi possível.
            </p>

            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 mb-8 text-left overflow-auto max-h-40">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60 mb-2">Detalhes do Erro</p>
              <code className="text-xs text-red-400 font-mono italic">
                {this.state.error?.message || 'Erro desconhecido'}
              </code>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full flex items-center justify-center gap-2 hover:bg-white/90 transition-all cursor-pointer"
              >
                <RefreshCcw className="w-4 h-4" />
                Recarregar Página
              </button>
              
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full h-14 bg-white/5 text-white font-black uppercase tracking-widest text-xs rounded-full flex items-center justify-center gap-2 hover:bg-white/10 transition-all border border-white/10 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Voltar ao Início
              </button>
            </div>
            
            <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-white/10">
              InfraLink Eventos • Central de Segurança
            </p>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
