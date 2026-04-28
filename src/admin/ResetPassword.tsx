import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Lock, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { safeFetch } from '../lib/fetch';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setError('Token ou e-mail ausente. Link de recuperação inválido.');
    }
  }, [token, email]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await safeFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword: password })
      });

      setSuccess(true);
      setTimeout(() => navigate('/admin/login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-black relative overflow-hidden">
      <div className="stars-container opacity-50"></div>
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-2/3 h-2/3 bg-brand-neon/10 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-2/3 h-2/3 bg-brand-blue/10 rounded-full blur-[140px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel max-w-md w-full p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden z-10"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-neon"></div>
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-brand-neon/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="text-brand-neon" size={32} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Nova <span className="text-brand-neon">Senha</span></h1>
          <p className="text-white/40 text-sm mt-2">Defina sua nova senha de acesso</p>
        </div>

        {success ? (
          <div className="text-center space-y-6 py-4">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500 animate-bounce">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Senha Redefinida!</h2>
              <p className="text-sm text-white/50">Sua senha foi alterada com sucesso. Redirecionando para o login...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/50 mb-3 ml-1">Nova Senha</label>
              <div className="relative">
                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                 <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 focus:border-brand-neon focus:ring-1 focus:ring-brand-neon outline-none transition-all placeholder:text-white/20"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/50 mb-3 ml-1">Confirmar Senha</label>
              <div className="relative">
                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                 <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 focus:border-brand-neon focus:ring-1 focus:ring-brand-neon outline-none transition-all placeholder:text-white/20"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl font-bold">{error}</div>}

            <button 
              type="submit" 
              disabled={loading || !!error && !password}
              className="w-full bg-brand-neon text-brand-black py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Redefinir Senha'}
            </button>

            <button 
              type="button" 
              onClick={() => navigate('/admin/login')}
              className="w-full text-white/40 text-xs font-bold hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} />
              Voltar para o login
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
