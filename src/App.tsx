import React, { Component, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import Plans from './components/Plans';
import Contact from './components/Contact';
import Login from './admin/Login';
import Dashboard from './admin/Dashboard';
import ResetPassword from './admin/ResetPassword';
import { Instagram } from 'lucide-react';
import { safeFetch } from './lib/fetch';

function LandingPage() {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    safeFetch('/api/content')
      .then(data => setContent(data.footer))
      .catch(err => console.error('Failed to fetch footer content:', err));
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-brand-black">
      {/* Background Stars & Mesh */}
      <div className="stars-container"></div>
      
      {/* Comets */}
      <div className="comet comet-1"></div>
      <div className="comet comet-2"></div>
      <div className="comet comet-3"></div>

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-brand-neon/15 rounded-full blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-brand-blue/15 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-[30%] right-[10%] w-[35%] h-[35%] bg-brand-cyan/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10">
        <Header />
        <main>
          <Hero />
          <Services />
          <Plans />
          <Contact />
        </main>
        <footer className="py-20 border-t border-white/5 bg-black/50 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h4 className="text-lg font-black tracking-tighter uppercase mb-4">InfraLink<span className="text-brand-neon">.</span>Eventos</h4>
            <p className="text-white/40 text-sm max-w-xs">{content?.description || 'Sua infraestrutura de rede para eventos com segurança e estabilidade.'}</p>
          </div>
          <div className="flex items-center gap-6">
            <a 
              href="https://instagram.com/infralink_eventos" 
              target="_blank" 
              rel="noreferrer"
              className="group flex items-center gap-2 px-4 py-2 bg-brand-neon/5 border border-brand-neon/20 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-neon hover:bg-brand-neon hover:text-brand-black transition-all"
            >
              <Instagram size={14} />
              Instagram
            </a>
            <p className="text-white/20 text-[10px] uppercase font-bold tracking-[2px]">&copy; {new Date().getFullYear()} {content?.copyright || 'InfraLink Eventos. Todos os direitos reservados.'}</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/reset-password" element={<ResetPassword />} />
          <Route 
            path="/admin/dashboard/*" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
