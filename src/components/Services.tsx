import { motion } from 'motion/react';
import { Wifi, ShieldCheck, Database, Headset, Battery, Satellite, Link, HelpCircle, HardDrive, Cpu, Globe, Zap, Camera, Video, Share2, Radio, Link as LinkIcon, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { safeFetch } from '../lib/fetch';

const iconMap: any = {
  'Wifi': Wifi,
  'Globe': Globe,
  'Zap': Zap,
  'Satellite': Satellite,
  'Camera': Camera,
  'Video': Video,
  'Battery': Battery,
  'Database': Database,
  'Headset': Headset,
  'Cpu': Cpu,
  'HardDrive': HardDrive,
  'Share2': Share2,
  'Radio': Radio,
  'Link': LinkIcon,
  'Activity': Activity,
  // Legacy mappings for backwards compatibility if needed
  'Internet Dedicada': Wifi,
  'Gerenciamento de Rede': ShieldCheck,
  'Estabilidade para Pagamentos': Database,
  'Suporte Durante Evento': Headset,
  'Suporte Presencial': Headset,
  'Banco de Baterias': Battery,
  'Banco de baterias incluso': Battery,
  'Internet Satélite': Satellite,
  'Link Dedicado': Link,
  'Rede Estruturada': HardDrive,
  'Monitoramento': Cpu
};

export default function Services() {
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    safeFetch('/api/services')
      .then(data => {
        if (Array.isArray(data)) {
          setServices(data);
        } else {
          console.error('Data received for services is not an array:', data);
          setServices([]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch services:', err);
        setServices([]);
      });
  }, []);

  return (
    <section id="servicos" className="py-32 px-6 md:px-12 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center mb-24">
          <div className="inline-flex items-center gap-2 px-6 py-2 bg-brand-blue/5 border border-brand-blue/30 rounded-full text-[10px] font-bold tracking-[0.2em] text-brand-blue uppercase mb-8 backdrop-blur-sm">
            O que oferecemos
          </div>
          
          <h2 className="text-4xl md:text-7xl font-black tracking-tighter mb-6 uppercase max-w-4xl">
            Soluções completas de <span className="gradient-text">infraestrutura</span>
          </h2>
          <p className="text-white/40 text-lg font-medium leading-relaxed max-w-2xl">
            Cada detalhe pensado para que a conectividade nunca seja um problema no seu evento.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {services.map((service, index) => {
            const iconName = service.icon || service.title;
            const IconComponent = iconMap[iconName] || iconMap[Object.keys(iconMap).find(k => iconName.includes(k)) || ''] || Wifi;
            
            return (
              <motion.div
                key={service.id || index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-panel p-10 rounded-3xl group hover:border-brand-neon/30 hover:bg-brand-neon/5 transition-all duration-500 flex flex-col w-full md:w-[calc(33.33%-1rem)] lg:max-w-[400px] min-h-[320px]"
              >
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-brand-neon group-hover:scale-110 transition-all duration-500 mb-10 border border-white/5">
                  <IconComponent size={24} />
                </div>
                
                <h3 className="text-xl font-bold mb-6 group-hover:text-white transition-colors">{service.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed font-medium group-hover:text-white/60 transition-colors">
                  {service.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
