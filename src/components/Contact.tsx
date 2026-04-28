import { motion } from 'motion/react';
import { MessageSquare, Phone, Send, MapPin, ExternalLink, ArrowRight, Instagram } from 'lucide-react';
import { useEffect, useState } from 'react';
import { safeFetch } from '../lib/fetch';

export default function Contact() {
  const [qrCode, setQrCode] = useState('');
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    console.log('Contact component mounted, fetching content...');
    safeFetch('/api/content')
      .then(data => {
        console.log('Content fetched:', data.contact);
        setContent(data.contact);
        const waUrl = data.contact?.whatsapp_url || 'https://wa.me/5535988019507';
        console.log('Fetching QR from server for:', waUrl);
        
        safeFetch(`/api/qrcode?text=${encodeURIComponent(waUrl)}`)
          .then(qrData => {
            if (qrData.url) {
              console.log('QR Code fetched from server successfully');
              setQrCode(qrData.url);
            }
          })
          .catch(err => {
            console.error('Failed to fetch QR code from server:', err);
          });
      })
      .catch(err => {
        console.error('Failed to fetch contact content:', err);
      });
  }, []);

  const whatsappUrl = content?.whatsapp_url || 'https://wa.me/5535988019507';

  return (
    <section id="contato" className="py-32 px-6 md:px-12 relative">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          <div className="flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold tracking-[0.2em] text-brand-neon uppercase mb-8 w-fit text-center">
              Atendimento Prioritário
            </div>
            <h2 className="text-4xl md:text-7xl font-black mb-8 leading-[0.9] tracking-tighter uppercase">
              Vamos tornar seu <span className="gradient-text">evento único</span>
            </h2>
            <p className="text-xl text-white/40 mb-16 max-w-lg leading-relaxed font-medium">
              Especialistas em conectividade crítica. Fale agora com nossa equipe técnica para um orçamento personalizado.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12">
              <div className="space-y-2">
                 <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Telefone</div>
                 <div className="flex items-center gap-3 text-lg font-bold text-white group cursor-pointer">
                    <Phone size={18} className="text-brand-neon" />
                    <span className="font-mono">{content?.phone || '5535988019507'}</span>
                 </div>
              </div>
              <div className="space-y-2">
                 <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Instagram</div>
                 <a 
                   href="https://instagram.com/infralink_eventos" 
                   target="_blank" 
                   rel="noreferrer"
                   className="flex items-center gap-3 text-lg font-bold text-white group hover:text-brand-neon transition-colors"
                 >
                    <Instagram size={18} className="text-brand-neon" />
                    <span className="font-mono">@infralink_eventos</span>
                 </a>
              </div>
              <div className="space-y-2">
                 <div className="text-[10px] font-black uppercase tracking-widest text-white/20">E-mail</div>
                 <div className="flex items-center gap-3 text-lg font-bold text-white group cursor-pointer">
                    <Send size={18} className="text-brand-neon" />
                    <span className="font-mono">{content?.email || 'contato@infralink.com.br'}</span>
                 </div>
              </div>
              <div className="space-y-2">
                 <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Localização</div>
                 <div className="flex items-center gap-3 text-lg font-bold text-white group">
                    <MapPin size={18} className="text-brand-neon" />
                    <span>{content?.location || 'Alfenas, Minas Gerais'}</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="relative">
             <div className="absolute -inset-4 bg-brand-neon/10 blur-3xl rounded-full opacity-50"></div>
             <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-panel p-16 rounded-[4rem] text-center border-white/10 relative z-10"
             >
                <div className="mb-12 inline-block p-4 bg-white rounded-3xl shadow-2xl relative group">
                  <div className="absolute inset-0 bg-brand-neon/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {qrCode ? (
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56 object-contain relative z-10" />
                  ) : (
                    <div className="w-56 h-56 bg-zinc-800 animate-pulse rounded-2xl"></div>
                  )}
                </div>
                
                <div className="space-y-2 mb-12">
                   <h3 className="text-xs font-black uppercase tracking-[0.4em] mb-2 text-white/40">WhatsApp Direto</h3>
                   <p className="text-2xl font-black font-mono">{content?.phone || '5535988019507'}</p>
                </div>
                
                <a 
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-brand-neon text-brand-black px-10 py-6 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 hover:scale-[1.02] transition-all shadow-[0_20px_40px_rgba(0,255,136,0.2)]"
                >
                  <MessageSquare size={18} />
                  Iniciar Conversa
                  <ArrowRight size={18} />
                </a>
             </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
