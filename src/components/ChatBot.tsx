import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { safeFetch } from '../lib/fetch';

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Olá! Sou o assistente virtual da InfraLink Eventos. Como posso te ajudar hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Fetch data for knowledge base
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [content, services, plans] = await Promise.all([
          safeFetch('/api/content'),
          safeFetch('/api/services'),
          safeFetch('/api/plans')
        ]);

        let kb = "Informações sobre a InfraLink Eventos:\n\n";
        
        if (content) {
          kb += "Conteúdo da Página:\n";
          Object.keys(content).forEach(section => {
            kb += `Seção ${section}:\n`;
            Object.keys(content[section]).forEach(key => {
              kb += `- ${key}: ${content[section][key]}\n`;
            });
          });
        }

        if (services && Array.isArray(services)) {
          kb += "\nServiços Disponíveis:\n";
          services.forEach((s: any) => {
            kb += `- ${s.title}: ${s.description}\n`;
          });
        }

        if (plans && Array.isArray(plans)) {
          kb += "\nPlanos Disponíveis:\n";
          plans.forEach((p: any) => {
            kb += `- Plano ${p.name}: ${p.price} (${p.period}). ${p.description}. Recursos: ${p.features}\n`;
          });
        }

        setKnowledgeBase(kb);
      } catch (err) {
        console.error('Failed to fetch knowledge base for chatbot:', err);
      }
    };

    fetchData();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Chave da API Gemini não configurada.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `
        Você é o assistente virtual da InfraLink Eventos, uma empresa especializada em conectividade profissional para eventos.
        Seu objetivo é responder perguntas baseadas no contexto fornecido.
        Seja educado, profissional e direto.
        Se não souber a resposta com base no contexto, sugira que o usuário entre em contato pelo WhatsApp (disponível no site).
        
        CONTEXTO:
        ${knowledgeBase}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const assistantMessage = response.text || "Desculpe, não consegui processar sua solicitação.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (err: any) {
      console.error('Chatbot error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${err.message || 'Ocorreu um erro ao processar sua pergunta.'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="chatbot-container" className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-brand-black border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-neon/20 flex items-center justify-center border border-brand-neon/30">
                  <Bot className="text-brand-neon" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Suporte InfraLink</h3>
                  <p className="text-[10px] text-brand-neon font-black uppercase tracking-widest">Online Agora</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' 
                      ? 'bg-brand-neon text-brand-black font-medium' 
                      : 'bg-white/5 border border-white/10 text-white/90'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <Loader2 className="text-brand-neon animate-spin" size={18} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white/5 border-t border-white/10">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Digite sua dúvida..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-brand-neon/50 transition-all placeholder:text-white/20"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-brand-neon flex items-center justify-center text-brand-black hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,255,136,0.2)]"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-[9px] text-white/20 text-center mt-3 uppercase font-bold tracking-widest">
                Powered by Gemini AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen ? 'bg-white text-black' : 'bg-brand-neon text-brand-black'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>
    </div>
  );
}
