import { motion } from 'motion/react';
import { ArrowRight, Wifi, Zap, Activity, Globe } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Hero() {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    fetch('/api/content')
      .then(res => res.json())
      .then(data => setContent(data.hero));
  }, []);

  return (
    <section id="inicio" className="relative min-h-screen pt-40 pb-20 px-6 md:px-12 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.05)_0%,transparent_70%)] pointer-events-none"></div>
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-brand-blue/10 rounded-full blur-[120px] pointer-events-none opacity-50"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-neon/5 border border-brand-neon/20 rounded-full text-[10px] font-bold tracking-[0.2em] text-brand-neon uppercase mb-8 backdrop-blur-sm">
            <Activity size={12} className="animate-pulse" />
            Infraestrutura de alta performance
          </div>
          
          <h1 className="text-5xl md:text-[6.5rem] font-black tracking-tighter leading-[0.9] mb-8 text-white max-w-5xl">
            {content?.title ? (
              <span dangerouslySetInnerHTML={{ __html: content.title }} />
            ) : (
              <>Seu <span className="text-white/40">evento</span> não pode <span className="gradient-text">parar.</span></>
            )}
          </h1>
          
          <p className="text-lg md:text-xl text-white/40 font-medium mb-12 max-w-2xl leading-relaxed mx-auto">
            {content?.subtitle || 'Conectividade profissional para eventos de qualquer porte. Link dedicado, gerenciamento de rede e suporte presencial 24/7.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 mt-4">
            <a 
              href="#contato"
              className="bg-gradient-to-r from-brand-neon to-brand-blue text-brand-black font-black uppercase tracking-widest px-10 py-5 rounded-2xl hover:scale-105 transition-all duration-300 shadow-[0_15px_40px_rgba(0,255,136,0.2)] flex items-center justify-center gap-2"
            >
              {content?.cta || 'Fale no WhatsApp'}
              <ArrowRight size={18} />
            </a>
            
            <a 
              href="#servicos"
              className="px-10 py-5 border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/5 transition-all duration-300 rounded-2xl bg-white/5 backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.05)]"
            >
              Nossos Serviços
            </a>
          </div>
        </motion.div>


      </div>

      {/* Stats Mini Grid */}
      <div className="max-w-7xl mx-auto w-full mt-32 relative z-10 px-6">
         <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <motion.div 
                key={i} 
                className="text-center md:text-left border-l border-white/10 pl-6 cursor-default group"
                whileHover={{ x: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="text-4xl font-black text-white mb-2 font-mono group-hover:text-brand-neon transition-all duration-300">
                  {content?.[`stat${i}_val`] || (i === 1 ? '99.9%' : i === 2 ? '500+' : i === 3 ? '24/7' : '< 10ms')}
                </div>
                <div className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] group-hover:text-white/60 transition-all duration-300">
                  {content?.[`stat${i}_label`] || (i === 1 ? 'Uptime garantido' : i === 2 ? 'Eventos realizados' : i === 3 ? 'Suporte técnico' : 'Latência média')}
                </div>
              </motion.div>
            ))}
         </div>
      </div>
    </section>
  );
}
