import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, ArrowUpRight, Zap } from 'lucide-react';

interface Plan {
  id: number;
  name: string;
  description: string;
  price: string;
  period: string;
  features: string;
  badge_text: string;
  highlight_color: string;
  is_featured: number;
  cta_text: string;
  cta_url: string;
  order_index: number;
  budget_text?: string;
}

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    fetch(`/api/plans?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => setPlans(data));
  }, []);

  return (
    <section id="planos" className="py-32 px-6 md:px-12 border-y border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-neon/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-blue/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col items-center text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-brand-neon/10 to-brand-blue/10 border border-brand-neon/20 rounded-full text-[10px] font-bold tracking-[0.2em] text-brand-neon uppercase mb-8 backdrop-blur-sm">
            <Zap size={12} />
            Planos e Preços
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 uppercase">
            Escolha o plano <span className="gradient-text">ideal</span>
          </h2>
          <p className="text-white/40 max-w-xl text-lg font-medium leading-relaxed">
            Soluções para eventos de todos os tamanhos. Desde pequenas celebrações até grandes festivais.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, index) => {
            const isFeatured = plan.is_featured === 1;
            const features = plan.features ? plan.features.split(',') : [];
            const highlightColor = plan.highlight_color || '#00FF88';
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`glass-panel p-10 rounded-[2rem] flex flex-col group relative transition-all duration-500 hover:-translate-y-2 ${isFeatured ? "scale-105 z-10" : "border-white/5"}`}
                style={isFeatured ? { 
                  boxShadow: `0 20px 50px ${highlightColor}20`,
                  border: `1px solid ${highlightColor}40`,
                  outline: `1px solid ${highlightColor}`
                } : {}}
              >
                {plan.badge_text && (
                  <div 
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 text-brand-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full flex items-center gap-2 shadow-lg"
                    style={{ backgroundColor: highlightColor }}
                  >
                    {plan.badge_text}
                  </div>
                )}

                <div className="flex flex-col h-full">
                  <div className="mb-8">
                    <h3 className="text-3xl font-black text-white mb-3">{plan.name}</h3>
                    <p className="text-white/50 text-sm font-medium leading-relaxed mb-6 min-h-[48px]">
                      {plan.description}
                    </p>
                    <div className="flex flex-col min-h-[90px] justify-end">
                      <span 
                        className="text-4xl font-black transition-colors"
                        style={isFeatured ? { color: highlightColor } : { color: 'white' }}
                      >
                        {plan.budget_text || plan.price}
                      </span>
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                        {plan.period}
                      </span>
                    </div>
                  </div>

                  <div className="flex-grow flex flex-col space-y-8 pt-8 border-t border-white/5">
                    <ul className="space-y-4 flex-grow">
                      {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-4 text-sm font-bold text-white/70">
                          <div 
                            className="w-5 h-5 mt-0.5 flex-shrink-0 rounded-full flex items-center justify-center transition-all bg-opacity-20"
                            style={{ backgroundColor: `${highlightColor}33`, color: highlightColor }}
                          >
                            <Check size={12} strokeWidth={4} />
                          </div>
                          <span className="leading-snug">{feature.trim()}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <a 
                      href={plan.cta_url || "#contato"}
                      onClick={() => {
                        fetch(`/api/plans/${plan.id}/click`, { method: 'POST' });
                      }}
                      className={`block w-full py-5 text-center font-black text-[11px] uppercase tracking-widest transition-all rounded-2xl border ${isFeatured ? 'text-brand-black border-transparent shadow-xl hover:-translate-y-1' : 'bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                      style={isFeatured ? { 
                        backgroundColor: highlightColor,
                      } : {}}
                    >
                      {plan.cta_text || 'Contratar plano'}
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-20 text-center">
            <p className="text-white/20 text-xs font-medium">
              Todos os planos incluem contrato, nota fiscal e garantia de SLA. Precisa de algo personalizado? <a href="#contato" className="text-brand-neon hover:underline">Fale conosco.</a>
            </p>
        </div>
      </div>
    </section>
  );
}
