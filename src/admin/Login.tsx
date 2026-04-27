import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      if (data.requires2FA) {
        setRequires2FA(true);
        setUserId(data.userId);
      } else {
        localStorage.setItem('token', data.token);
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setForgotSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      localStorage.setItem('token', data.token);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-black relative overflow-hidden">
      {/* Background Stars & Mesh */}
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
          <h1 className="text-3xl font-black uppercase tracking-tighter">Admin <span className="text-brand-neon">Panel</span></h1>
          <p className="text-white/40 text-sm mt-2">Acesso restrito para InfraLink Eventos</p>
        </div>

        <AnimatePresence mode="wait">
          {isForgotPassword ? (
            <motion.form 
              key="forgot"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleForgotPassword} 
              className="space-y-6"
            >
              <div className="text-center mb-6">
                 <Lock className="mx-auto text-brand-neon mb-3" size={40} />
                 <h2 className="text-xl font-bold mb-1">Recuperar Senha</h2>
                 <p className="text-xs text-white/50">Digite seu e-mail para receber as instruções</p>
              </div>

              {forgotSent ? (
                <div className="p-6 bg-brand-neon/5 border border-brand-neon/20 rounded-3xl text-center space-y-4">
                  <p className="text-sm text-white/70">Instruções enviadas! Verifique sua caixa de entrada (ou o console em desenvolvimento).</p>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsForgotPassword(false);
                      setForgotSent(false);
                    }}
                    className="text-brand-neon text-sm font-bold underline"
                  >
                    Voltar para o login
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-white/50 mb-3 ml-1">E-mail</label>
                    <div className="relative">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                       <input 
                        type="email" 
                        value={forgotEmail} 
                        onChange={e => setForgotEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 focus:border-brand-neon focus:ring-1 focus:ring-brand-neon outline-none transition-all placeholder:text-white/20"
                        placeholder="admin@exemplo.com"
                        required
                      />
                    </div>
                  </div>

                  {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl font-bold">{error}</div>}

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-brand-neon text-brand-black py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'Enviar Instruções'}
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setIsForgotPassword(false)}
                    className="w-full text-white/40 text-xs font-bold hover:text-white"
                  >
                    Cancelar e voltar ao login
                  </button>
                </>
              )}
            </motion.form>
          ) : !requires2FA ? (
            <motion.form 
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleLogin} 
              className="space-y-6"
            >
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-white/50 mb-3 ml-1">Usuário</label>
                <div className="relative">
                   <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                   <input 
                    type="text" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 focus:border-brand-neon focus:ring-1 focus:ring-brand-neon outline-none transition-all placeholder:text-white/20"
                    placeholder="Nome de usuário ou e-mail"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 ml-1">
                  <label className="block text-xs font-black uppercase tracking-widest text-white/50">Senha</label>
                  <button 
                    type="button" 
                    onClick={() => setIsForgotPassword(true)}
                    className="text-[10px] text-brand-neon uppercase font-black tracking-widest hover:underline"
                  >
                    Esqueceu?
                  </button>
                </div>
                <div className="relative">
                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                   <input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 focus:border-brand-neon focus:ring-1 focus:ring-brand-neon outline-none transition-all placeholder:text-white/20"
                    placeholder="••••••••"
                    required
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

              {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl font-bold">{error}</div>}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-brand-neon text-brand-black py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Entrar na Conta'}
              </button>

              <button 
                type="button" 
                onClick={() => navigate('/')}
                className="w-full text-white/40 text-xs font-bold hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} />
                Voltar para o site
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="2fa"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleVerify2FA} 
              className="space-y-6"
            >
              <div className="text-center p-6 bg-brand-neon/5 border border-brand-neon/20 rounded-3xl mb-8">
                 <ShieldCheck className="mx-auto text-brand-neon mb-3" size={40} />
                 <h2 className="text-lg font-bold mb-1">Verificação em 2 Etapas</h2>
                 <p className="text-xs text-white/50">Abra o Google Authenticator</p>
              </div>

              <div>
                <input 
                  type="text" 
                  value={code} 
                  onChange={e => setCode(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 text-center text-3xl font-bold tracking-[0.5em] focus:border-brand-neon outline-none"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>

              {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl font-bold text-center">{error}</div>}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-brand-neon text-brand-black py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Código'}
              </button>

              <button 
                type="button" 
                onClick={() => setRequires2FA(false)}
                className="w-full text-white/40 text-xs font-bold hover:text-white"
              >
                Voltar para o início
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
