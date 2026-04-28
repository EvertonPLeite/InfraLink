import { useState, useEffect } from 'react';
import { Menu, X, Lock, Instagram } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { safeFetch } from '../lib/fetch';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    safeFetch('/api/content')
      .then(data => setContent(data.general))
      .catch(err => console.error('Failed to fetch header content:', err));

    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Início', href: '#inicio' },
    { name: 'Serviços', href: '#servicos' },
    { name: 'Planos', href: '#planos' },
    { name: 'Contato', href: '#contato' },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        isScrolled 
          ? 'py-4' 
          : 'py-8'
      }`}
    >
      <div 
        className={`max-w-7xl mx-auto px-6 transition-all duration-500 h-16 flex items-center justify-between rounded-full border border-transparent ${
          isScrolled 
            ? 'bg-brand-black/95 backdrop-blur-xl border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] mx-6' 
            : 'bg-transparent'
        }`}
      >
        {/* Brand */}
        <a href="#inicio" className="flex items-center group pl-4">
          <Logo className="h-8 md:h-10" src={content?.logo_url} />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              className={`text-[10px] font-black tracking-[0.2em] uppercase transition-colors ${
                isScrolled ? 'text-white/90 hover:text-brand-neon' : 'text-white/50 hover:text-brand-neon'
              }`}
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4 pr-2">
          <a 
            href="https://instagram.com/infralink_eventos" 
            target="_blank"
            rel="noreferrer"
            className={`w-10 h-10 border rounded-full flex items-center justify-center transition-all ${
              isScrolled 
                ? 'border-white/30 text-white/90 hover:text-white hover:border-white/50 bg-white/5' 
                : 'border-white/10 text-white/40 hover:text-white hover:border-white/30'
            }`}
          >
            <Instagram size={16} />
          </a>
          <Link 
            to="/admin/login" 
            className="flex items-center gap-2 bg-brand-neon px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-black hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,255,136,0.2)]"
          >
            <Lock size={12} />
            Acesso Restrito
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button 
          className={`md:hidden w-10 h-10 rounded-full flex items-center justify-center text-white mr-4 transition-all ${
            isScrolled ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-transparent'
          }`} 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-24 left-6 right-6 bg-brand-black/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] overflow-hidden md:hidden shadow-2xl"
          >
            <div className="flex flex-col gap-6 p-12 items-center">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  className="text-2xl font-black uppercase tracking-widest text-white/80 hover:text-brand-neon animate-in slide-in-from-bottom"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="w-full pt-8 mt-4 border-t border-white/5 flex flex-col gap-4">
                <a 
                  href="https://instagram.com/infralink_eventos"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  <Instagram size={14} />
                  Siga no Instagram
                </a>
                <Link 
                  to="/admin/login"
                  className="w-full flex items-center justify-center gap-2 bg-brand-neon text-brand-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Lock size={14} />
                  Login Admin
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
