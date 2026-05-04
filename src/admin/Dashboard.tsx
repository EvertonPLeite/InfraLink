import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FileEdit, Settings, LogOut, Plus, Pencil, Trash2, Shield, ArrowLeft, Save, Loader2, Link2, BarChart3, Wifi, Globe, Zap, Satellite, Camera, Video, Battery, Database, Headset, Cpu, HardDrive, Share2, Radio, Link as LinkIcon, Activity, Users, Calendar, MapPin, DollarSign, Search, FileText, Upload, Check } from 'lucide-react';

// Reusable Image Upload Component with Progress Bar
function ImageUploadField({ value, onChange, label, placeholder = "Arraste ou clique para upload" }: { value: string, onChange: (val: string) => void, label: string, placeholder?: string }) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    
    setUploading(true);
    setProgress(0);
    
    // Simulate/Show progress during file reading
    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
      }
    };

    reader.onload = (e) => {
      // Small artificial delay to show progress bar if it was too fast
      let currentProgress = progress;
      const interval = setInterval(() => {
        currentProgress += 5;
        if (currentProgress >= 100) {
          clearInterval(interval);
          setUploading(false);
          onChange(e.target?.result as string);
          setTimeout(() => setProgress(0), 1000);
        } else {
          setProgress(currentProgress);
        }
      }, 20);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-black uppercase text-white/40">{label}</label>
      
      <div 
        className={`relative h-32 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 overflow-hidden
          ${dragActive ? 'border-brand-neon bg-brand-neon/5 scale-[0.98]' : 'border-white/10 bg-white/5 hover:border-white/20'}
          ${uploading ? 'pointer-events-none' : 'cursor-pointer'}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }}
        onClick={() => !uploading && document.getElementById(`file-input-${label.replace(/\s+/g, '')}`)?.click()}
      >
        <input 
          id={`file-input-${label.replace(/\s+/g, '')}`}
          type="file" 
          className="hidden" 
          accept="image/*"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />

        {uploading ? (
          <div className="w-full px-12 text-center animate-in fade-in zoom-in duration-300">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-neon mb-3">Enviando... {progress}%</p>
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-brand-neon shadow-[0_0_10px_rgba(0,255,136,0.5)]"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            {value ? (
              <div className="absolute inset-0 flex items-center justify-center p-2">
                <img src={value} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg opacity-40 grayscale group-hover:grayscale-0 transition-all" />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                   <div className="p-3 bg-brand-neon/20 rounded-2xl text-brand-neon">
                      <Upload size={24} />
                   </div>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 bg-white/5 rounded-2xl text-white/20">
                  <Upload size={24} />
                </div>
                <p className="text-xs font-bold text-white/40">{placeholder}</p>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex gap-4">
        <input 
          className="flex-grow bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-neon outline-none font-mono text-[10px] text-white/50"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ou cole a URL aqui..."
        />
        {value && (
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 border border-green-500/20">
            <Check size={18} />
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie } from 'recharts';
import { safeFetch } from '../lib/fetch';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111] border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">{label}</p>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].fill || payload[0].color }} />
          <p className="text-sm font-bold">
            {payload[0].value} <span className="text-white/40 font-medium">Cliques</span>
          </p>
        </div>
        <p className="text-[10px] text-white/30 mt-2 font-medium italic">Baseado nos últimos 7 dias</p>
      </div>
    );
  }
  return null;
};

function FinancialSummary({ customers = [], inventory = [] }: { customers: any[], inventory?: any[] }) {
  const calculateStats = () => {
    let received = 0;
    let toReceive = 0;
    let totalOpsCost = 0;
    let totalRevenue = 0;
    let totalInventoryInvestment = 0;

    const safeCustomers = Array.isArray(customers) ? customers : [];
    const safeInventory = Array.isArray(inventory) ? inventory : [];

    safeCustomers.forEach(c => {
      if (!c) return;
      const budget = parseFloat(c.budget) || 0;
      const cost = parseFloat(c.cost) || 0;
      
      if (c.status !== 'Cancelado') {
        totalRevenue += budget;
        totalOpsCost += cost;
        
        if (c.status === 'Concluído') {
          received += budget;
        } else {
          toReceive += budget;
        }
      }
    });

    safeInventory.forEach(item => {
      if (!item) return;
      totalInventoryInvestment += parseFloat(item.price) || 0;
    });

    const totalCosts = totalOpsCost + totalInventoryInvestment;

    return { 
      received, 
      toReceive, 
      totalRevenue,
      totalOpsCost,
      totalInventoryInvestment,
      totalCosts,
      profit: totalRevenue - totalCosts 
    };
  };

  const stats = calculateStats();

  const pieData = [
    { name: 'Custo Operacional', value: stats.totalOpsCost, color: '#fb923c' },
    { name: 'Investimento', value: stats.totalInventoryInvestment, color: '#60a5fa' },
    { name: 'Lucro Lqd', value: Math.max(0, stats.profit), color: '#00FF88' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel p-6 rounded-[2rem] border-white/5 relative overflow-hidden group flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Receita Total</p>
              <div className="text-2xl font-black tracking-tighter">R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl text-white/20">
              <DollarSign size={20} />
            </div>
          </div>
          
          <div className="glass-panel p-6 rounded-[2rem] border-white/5 relative overflow-hidden group flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Custos Operacionais</p>
              <div className="text-2xl font-black tracking-tighter text-orange-400">R$ {stats.totalOpsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="p-3 bg-orange-400/10 rounded-2xl text-orange-400/40">
              <Activity size={20} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-[2rem] border-white/5 relative overflow-hidden group flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Investimento Equip.</p>
              <div className="text-2xl font-black tracking-tighter text-blue-400">R$ {stats.totalInventoryInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="p-3 bg-blue-400/10 rounded-2xl text-blue-400/40">
              <Package size={20} />
            </div>
          </div>

          <div className={`glass-panel p-6 rounded-[2rem] border-white/5 relative overflow-hidden group flex items-start justify-between ${stats.profit < 0 ? 'border-red-500/20 bg-red-500/5' : 'border-brand-neon/20 bg-brand-neon/5'}`}>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${stats.profit < 0 ? 'text-red-400' : 'text-brand-neon/60'}`}>Lucro Líquido</p>
              <div className={`text-2xl font-black tracking-tighter ${stats.profit < 0 ? 'text-red-500' : 'text-brand-neon'}`}>R$ {stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className={`p-3 rounded-2xl ${stats.profit < 0 ? 'bg-red-500/10 text-red-500/40' : 'bg-brand-neon/10 text-brand-neon/40'}`}>
              <BarChart3 size={20} />
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-[2rem] border-white/5 flex flex-col items-center justify-center min-h-[250px]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 self-start">Distribuição Financeira</p>
          <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel p-6 rounded-[2rem] border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Confirmado / Recebido</p>
            <div className="text-xl font-bold">R$ {stats.received.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
             <Zap size={20} />
          </div>
        </div>
        <div className="glass-panel p-6 rounded-[2rem] border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">A Receber</p>
            <div className="text-xl font-bold">R$ {stats.toReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
             <Calendar size={20} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchInventory = () => {
    safeFetch('/api/admin/inventory', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(data => setInventory(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching inventory for summary:', err);
        setInventory([]);
      });
  };

  const fetchCustomers = () => {
    safeFetch('/api/admin/customers', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(data => {
        setCustomers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching customers:', err);
        setCustomers([]);
        setLoading(false);
      });
  };

  const fetchPlans = () => {
    safeFetch('/api/plans')
      .then(data => setPlans(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching plans:', err);
        setPlans([]);
      });
  };

  useEffect(() => {
    fetchCustomers();
    fetchPlans();
    fetchInventory();
  }, []);

  const handleDelete = async (id: number) => {
    console.log('Frontend: Executando exclusão do cliente ID:', id);
    const token = localStorage.getItem('token');
    
    if (!token) {
      alert('Sessão expirada. Por favor, faça login novamente.');
      return;
    }
    
    try {
      await safeFetch(`/api/admin/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Frontend: Exclusão bem-sucedida');
      setDeletingId(null);
      fetchCustomers();
    } catch (error: any) {
      console.error('Frontend: Erro ao excluir cliente:', error);
      alert(`Erro ao excluir cliente: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const saveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    
    // Ensure numbers
    data.budget = data.budget.toString().replace(',', '.');
    data.cost = data.cost.toString().replace(',', '.');

    const method = editingCustomer?.id ? 'PUT' : 'POST';
    const url = editingCustomer?.id ? `/api/admin/customers/${editingCustomer.id}` : '/api/admin/customers';

    try {
      const response = await safeFetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (response && (response as any).warning) {
        alert(`Aviso: ${(response as any).warning}`);
      }

      setEditingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      console.error('Error saving customer:', err);
      alert(`Erro ao salvar cliente: ${err.message}`);
    }
  };

  // Helper to format date without UTC shift
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--/--/----';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const generateContract = (customer: any) => {
    const doc = new jsPDF();
    const chosenPlan = Array.isArray(plans) ? plans.find(p => p.id === customer.plan_id) : null;
    
    // Minimalist Top Accent
    doc.setFillColor(0, 255, 136); // brand-neon
    doc.rect(0, 0, 210, 2, 'F');
    
    // Header - Clean Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(20, 20, 20);
    doc.text("InfraLink", 20, 25);
    const mainWidth = doc.getTextWidth("InfraLink");
    
    doc.setTextColor(0, 255, 136);
    doc.text(".", 20 + mainWidth, 25);
    const dotWidth = doc.getTextWidth(".");
    
    doc.setTextColor(80, 80, 80);
    doc.text("Eventos", 20 + mainWidth + dotWidth, 25);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("INFRAESTRUTURA TECNOLÓGICA & CONECTIVIDADE", 20, 32);

    // Document Info (Right Aligned)
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`NÚMERO DO DOCUMENTO: #${String(customer.id).padStart(5, '0')}`, 140, 25);
    doc.text(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, 140, 30);

    // Divider
    doc.setDrawColor(240, 240, 240);
    doc.line(20, 45, 190, 45);

    // Client Info
    let y = 60;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRATANTE", 20, y);
    
    y += 8;
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text(customer.name.toUpperCase(), 20, y);
    
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text([
      `E-mail: ${customer.email || "Não informado"}`,
      `Fone: ${customer.phone || "Não informado"}`,
      `Local: ${customer.location || "Não cadastrado"}`
    ], 20, y);

    // Event Title Section
    y += 28;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(150, 150, 150);
    doc.text("DADOS DO PROJETO / EVENTO", 20, y);
    
    y += 7;
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text((customer.event_name || customer.name).toUpperCase(), 20, y);
    
    y += 2;
    doc.setDrawColor(0, 255, 136);
    doc.setLineWidth(1);
    doc.line(20, y + 1, 45, y + 1);

    // Service Description
    y += 18;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(150, 150, 150);
    doc.text("RESUMO DA PROPOSTA TÉCNICA", 20, y);
    
    autoTable(doc, {
      startY: y + 5,
      head: [['ITEM', 'DESCRIÇÃO']],
      body: [
        ['CONTRATANTE', customer.name],
        ['CONTATO', `${customer.phone || 'Não informado'} / ${customer.email || 'Não informado'}`],
        ['EVENTO', customer.event_name || 'Projeto Personalizado'],
        ['LOCALIZAÇÃO', customer.location],
        ['PLANO SELECIONADO', chosenPlan ? chosenPlan.name : 'Vendas Diretas / Sob Demanda'],
        ['PERÍODO', `${formatDate(customer.event_date)}${customer.end_date ? ` até ${formatDate(customer.end_date)}` : ''}`],
        ['INVESTIMENTO', `R$ ${parseFloat(customer.budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ],
      theme: 'plain',
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 255, 136], 
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: { bottom: 5 }
      },
      styles: { 
        fontSize: 10, 
        cellPadding: 4,
        textColor: [60, 60, 60],
        lineColor: [245, 245, 245],
        lineWidth: 0.1
      },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 40, textColor: [120, 120, 120] } 
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Notes / Terms
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(150, 150, 150);
    doc.text("CLÁUSULAS E CONDIÇÕES", 20, finalY);
    
    finalY += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const terms = [
      "I. A contratada compromete-se com a entrega da estabilidade de rede dentro dos padrões acordados.",
      "II. O contratante deve fornecer acesso prévio ao local para instalação de equipamentos.",
      "III. Danos causados por terceiros ao equipamento da contratada são de responsabilidade do contratante.",
      "IV. O cancelamento com menos de 72h implica em multa de 30% sobre o valor total."
    ];
    terms.forEach(term => {
      const splitText = doc.splitTextToSize(term, 170);
      doc.text(splitText, 20, finalY);
      finalY += (splitText.length * 5);
    });

    finalY += 25;

    // Signatures
    doc.setDrawColor(200, 200, 200);
    doc.line(20, finalY, 90, finalY);
    doc.line(120, finalY, 190, finalY);
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("RESPONSÁVEL INFRALINK", 20, finalY + 5);
    doc.text("ACEITE DO CONTRATANTE", 120, finalY + 5);

    doc.save(`Proposta_Infralink_${customer.name.replace(/\s+/g, '_')}.pdf`);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-neon" /></div>;

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tighter">Gestão de <span className="text-brand-neon">Clientes & Eventos</span></h2>
        <button 
          onClick={() => setEditingCustomer({})}
          className="bg-brand-neon text-brand-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all text-sm"
        >
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      {/* Financial Dashboard */}
      <FinancialSummary customers={customers} inventory={inventory} />

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-neon transition-colors" size={20} />
        <input 
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-[2rem] pl-16 pr-8 py-5 focus:border-brand-neon outline-none transition-all text-lg font-medium placeholder:text-white/10"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors text-xs font-bold uppercase"
          >
            Limpar
          </button>
        )}
      </div>

      <AnimatePresence>
        {editingCustomer && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel p-8 rounded-[2.5rem] border-brand-neon/30"
          >
            <form onSubmit={saveCustomer} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Nome do Contratante (Cliente)</label>
                  <input name="name" defaultValue={editingCustomer.name} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" placeholder="Ex: Everton Prado Leite" required />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Nome do Evento / Projeto</label>
                  <input name="event_name" defaultValue={editingCustomer.event_name} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" placeholder="Ex: Simpósio de TI 2024" required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Local (Cidade/Espaço)</label>
                  <input name="location" defaultValue={editingCustomer.location} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" placeholder="Ex: Hotel Glória, Rio de Janeiro" required />
                </div>
                <div>
                   <label className="block text-xs font-black uppercase text-white/40 mb-3">Status</label>
                   <select name="status" defaultValue={editingCustomer.status || 'Pendente'} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon appearance-none outline-none">
                     <option value="Pendente">Pendente</option>
                     <option value="Em Negociação">Em Negociação</option>
                     <option value="Confirmado">Confirmado</option>
                     <option value="Concluído">Concluído</option>
                     <option value="Cancelado">Cancelado</option>
                   </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Data do Evento</label>
                  <div className="relative group">
                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-neon transition-colors pointer-events-none" size={18} />
                    <input name="event_date" type="date" defaultValue={editingCustomer.event_date} className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 focus:border-brand-neon outline-none transition-all" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Orçamento (R$)</label>
                  <input name="budget" defaultValue={editingCustomer.budget} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" placeholder="Ex: 5000.00" required />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Custo (R$)</label>
                  <input name="cost" defaultValue={editingCustomer.cost || 0} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" placeholder="Ex: 1000.00" required />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Plano Contratado</label>
                  <select name="plan_id" defaultValue={editingCustomer.plan_id || ''} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon appearance-none outline-none">
                    <option value="">Nenhum / Personalizado</option>
                    {Array.isArray(plans) && plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Início do Evento</label>
                  <div className="relative group">
                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-neon transition-colors pointer-events-none" size={18} />
                    <input name="start_date" type="date" defaultValue={editingCustomer.start_date} className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 focus:border-brand-neon outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Término do Evento</label>
                  <div className="relative group">
                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-neon transition-colors pointer-events-none" size={18} />
                    <input name="end_date" type="date" defaultValue={editingCustomer.end_date} className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 focus:border-brand-neon outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Telefone Cliente</label>
                  <input name="phone" defaultValue={editingCustomer.phone} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Email Cliente</label>
                  <input name="email" type="email" defaultValue={editingCustomer.email} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" placeholder="cliente@email.com" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="bg-brand-neon text-brand-black px-8 py-4 rounded-2xl font-bold flex items-center gap-2">
                   <Save size={18} /> Salvar Cliente
                </button>
                <button type="button" onClick={() => setEditingCustomer(null)} className="bg-white/5 px-8 py-4 rounded-2xl font-bold hover:bg-white/10">Cancelar</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {(!Array.isArray(customers) || customers.length === 0) ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
             <Users size={48} className="mx-auto text-white/10 mb-4" />
             <p className="text-white/40 font-medium">Nenhum cliente cadastrado ainda.</p>
          </div>
        ) : customers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (customer.event_name && customer.event_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (customer.location && customer.location.toLowerCase().includes(searchTerm.toLowerCase()))
          ).length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
             <Search size={48} className="mx-auto text-white/10 mb-4" />
             <p className="text-white/40 font-medium">Nenhum resultado encontrado para "{searchTerm}"</p>
          </div>
        ) : (
          customers
            .filter(customer => 
              customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
              (customer.event_name && customer.event_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (customer.location && customer.location.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .map(customer => {
            const chosenPlan = Array.isArray(plans) ? plans.find(p => p.id === customer.plan_id) : null;
            return (
              <div key={customer.id} className="glass-panel p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-white/20 transition-all">
                <div className="flex-grow">
                   <div className="flex items-center gap-4 mb-4">
                      <h4 className="text-xl font-bold">{customer.event_name || customer.name}</h4>
                      {chosenPlan && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: `${chosenPlan.highlight_color}20`, color: chosenPlan.highlight_color }}>
                          {chosenPlan.name}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        customer.status === 'Confirmado' ? 'bg-green-500/10 text-green-500' :
                        customer.status === 'Em Negociação' ? 'bg-blue-500/10 text-brand-blue' :
                        customer.status === 'Concluído' ? 'bg-white/10 text-white/60' :
                        customer.status === 'Cancelado' ? 'bg-red-500/10 text-red-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {customer.status}
                      </span>
                   </div>
                 <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-white/40 font-medium">
                    <div className="flex items-center gap-2">
                       <MapPin size={14} className="text-brand-neon" />
                       {customer.location}
                    </div>
                    <div className="flex items-center gap-2">
                       <Calendar size={14} className="text-brand-neon" />
                       {formatDate(customer.event_date)}
                       {(customer.start_date || customer.end_date) && (
                         <span className="ml-1 opacity-50">
                           ({formatDate(customer.start_date)} - {formatDate(customer.end_date)})
                         </span>
                       )}
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                         <Radio size={14} className="text-brand-neon" />
                         {customer.phone}
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2">
                         <Globe size={14} className="text-brand-neon" />
                         {customer.email}
                      </div>
                    )}
                    <div className="flex items-center gap-2 font-bold text-white/60">
                       <DollarSign size={14} className="text-brand-neon" />
                       Lucro: <span className="text-brand-neon ml-1">R$ {(parseFloat(customer.budget) - parseFloat(customer.cost || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-60">
                       Orçamento: R$ {parseFloat(customer.budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                {deletingId === customer.id ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                    <button 
                      onClick={() => handleDelete(customer.id)}
                      className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                    >
                      Confirmar
                    </button>
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="px-4 py-2 bg-white/10 text-white text-xs font-bold rounded-xl hover:bg-white/20 transition-all"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => generateContract(customer)}
                      className="p-3 bg-white/5 rounded-xl hover:bg-brand-neon/20 hover:text-brand-neon transition-all"
                      title="Gerar Contrato PDF"
                    >
                       <FileText size={18} />
                    </button>
                    <button onClick={() => setEditingCustomer(customer)} className="p-3 bg-white/5 rounded-xl hover:bg-brand-blue/20 hover:text-brand-blue transition-all">
                       <Pencil size={18} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!customer.id) {
                          console.error('Erro: ID do cliente não encontrado');
                          return;
                        }
                        console.log('Botão excluir cliente clicado. ID:', customer.id);
                        setDeletingId(customer.id);
                      }} 
                      className="p-3 bg-white/5 rounded-xl hover:bg-red-500/20 hover:text-red-500 transition-all relative z-10"
                      title="Excluir Registro"
                    >
                       <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
    </div>
  );
}

function Analytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    safeFetch('/api/admin/stats/plan-clicks', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(stats => {
        setData(Array.isArray(stats) ? stats : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Analytics error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-neon" /></div>;

  const totalClicksThisWeek = Array.isArray(data) ? data.reduce((acc, curr) => acc + (curr?.clicks || 0), 0) : 0;
  const dailyAverage = totalClicksThisWeek / 7;

  return (
    <div className="space-y-12">
      <h2 className="text-3xl font-black tracking-tighter">Interações <span className="text-brand-neon">& Cliques</span></h2>
      
      <div className="glass-panel p-8 rounded-[3rem] h-[450px]">
        <div className="mb-8 flex items-center justify-between">
           <div>
             <h3 className="font-bold uppercase tracking-widest text-[10px] text-white/40">Cliques nos Planos</h3>
             <p className="text-xs text-white/20">Distribuição diária na última semana</p>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-neon" />
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Hoje</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Outros Dias</span>
              </div>
           </div>
        </div>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart 
            data={Array.isArray(data) ? data : []}
            onMouseMove={(state) => {
              if (state && state.activeTooltipIndex !== undefined) {
                setHoverIndex(state.activeTooltipIndex);
              } else {
                setHoverIndex(null);
              }
            }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#666', fontSize: 10, fontWeight: 700 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#666', fontSize: 10, fontWeight: 700 }}
              dx={-10}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              content={<CustomTooltip />}
            />
            <Legend 
              verticalAlign="top" 
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px' }}
              formatter={(value) => <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 ml-1">{value}</span>}
            />
            <Bar dataKey="clicks" name="Cliques Registrados" radius={[6, 6, 0, 0]}>
              {(Array.isArray(data) ? data : []).map((entry, index) => {
                const isToday = index === new Date().getDay();
                const isHovered = hoverIndex === index;
                return (
                   <Cell 
                    key={`cell-${index}`} 
                    fill={isToday ? '#00FF88' : '#007BFF'} 
                    fillOpacity={isHovered ? 1 : 0.7}
                    style={{ transition: 'all 0.3s ease' }}
                    className="cursor-pointer"
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="glass-panel p-8 rounded-3xl flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase text-white/20 mb-2">Total na Semana</div>
              <div className="text-4xl font-black text-brand-neon">{totalClicksThisWeek}</div>
            </div>
            <div className="p-4 bg-brand-neon/10 rounded-2xl text-brand-neon/40">
              <BarChart3 size={24} />
            </div>
         </div>
         <div className="glass-panel p-8 rounded-3xl flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase text-white/20 mb-2">Média Diária</div>
              <div className="text-4xl font-black text-white">{dailyAverage.toFixed(1)}</div>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl text-white/20">
              <Activity size={24} />
            </div>
         </div>
      </div>
    </div>
  );
}

function EditContent() {
  const [content, setContent] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successSection, setSuccessSection] = useState<string | null>(null);

  useEffect(() => {
    safeFetch('/api/content')
      .then(data => {
        setContent(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching content:', err);
        setLoading(false);
      });
  }, []);

  const handleChange = (section: string, key: string, value: string) => {
    setContent((prev: any) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value
      }
    }));
  };

  const handleSaveSection = async (section: string) => {
    setSaving(true);
    setSuccessSection(null);
    
    const updates = Object.entries(content[section] || {}).map(([key, value]) => ({
      section,
      key,
      value: value as string
    }));

    try {
      await safeFetch('/api/admin/content/batch', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ updates })
      });
      
      setSuccessSection(section);
      setTimeout(() => setSuccessSection(null), 3000);
    } catch (error: any) {
      console.error('Error saving section:', error);
      alert(`Erro ao salvar seção: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-neon" /></div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tighter">Editar <span className="text-brand-neon">Conteúdo</span></h2>
        {saving && <span className="text-xs bg-brand-neon/10 text-brand-neon px-3 py-1 rounded-full font-bold animate-pulse">Processando...</span>}
      </div>

      <div className="grid grid-cols-1 gap-10">
        {/* Logo & Geral */}
        <div className="glass-panel p-8 rounded-[2rem] space-y-8 relative overflow-hidden">
           {successSection === 'general' && <div className="absolute inset-0 bg-brand-neon/10 backdrop-blur-sm flex items-center justify-center z-10 animate-in fade-in duration-300"><div className="bg-brand-neon text-brand-black px-6 py-3 rounded-full font-bold shadow-lg">Alterações Salvas!</div></div>}
           <div className="flex items-center justify-between border-b border-brand-neon/10 pb-4 mb-4">
              <div className="flex items-center gap-3 text-brand-neon">
                <Settings size={20} />
                <h3 className="font-bold uppercase tracking-widest text-sm">Configurações Gerais</h3>
              </div>
              <button 
                onClick={() => handleSaveSection('general')}
                className="bg-brand-neon/10 hover:bg-brand-neon text-brand-neon hover:text-brand-black px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Save size={14} /> Salvar Geral
              </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black uppercase text-white/40 mb-3">Nome do Site</label>
                <input 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none"
                  value={content.general?.site_name || ''}
                  onChange={(e) => handleChange('general', 'site_name', e.target.value)}
                />
              </div>
              <ImageUploadField 
                label="Logo do Site"
                value={content.general?.logo_url || ''}
                onChange={(val) => handleChange('general', 'logo_url', val)}
                placeholder="Upload da Logo (.png, .jpg, .svg)"
              />
           </div>
        </div>

        {/* Hero */}
        <div className="glass-panel p-8 rounded-[2rem] space-y-8 relative overflow-hidden">
           {successSection === 'hero' && <div className="absolute inset-0 bg-brand-neon/10 backdrop-blur-sm flex items-center justify-center z-10 animate-in fade-in duration-300"><div className="bg-brand-neon text-brand-black px-6 py-3 rounded-full font-bold shadow-lg">Alterações Salvas!</div></div>}
           <div className="flex items-center justify-between border-b border-brand-neon/10 pb-4 mb-4">
              <div className="flex items-center gap-3 text-brand-neon">
                <FileEdit size={20} />
                <h3 className="font-bold uppercase tracking-widest text-sm">Seção Hero (Início)</h3>
              </div>
              <button 
                onClick={() => handleSaveSection('hero')}
                className="bg-brand-neon/10 hover:bg-brand-neon text-brand-neon hover:text-brand-black px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Save size={14} /> Salvar Seção Hero
              </button>
           </div>
           <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase text-white/40 mb-3">Título Principal</label>
                <textarea 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 focus:border-brand-neon outline-none min-h-[100px]"
                  value={content.hero?.title || ''}
                  onChange={(e) => handleChange('hero', 'title', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-white/40 mb-3">Subtítulo</label>
                <textarea 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 focus:border-brand-neon outline-none min-h-[80px]"
                  value={content.hero?.subtitle || ''}
                  onChange={(e) => handleChange('hero', 'subtitle', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="block text-xs font-black uppercase text-white/40 mb-3">Texto do Botão CTA</label>
                    <input 
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none"
                      value={content.hero?.cta || ''}
                      onChange={(e) => handleChange('hero', 'cta', e.target.value)}
                    />
                 </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-6">Estatísticas do Hero</h4>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="space-y-3">
                         <input 
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-neon outline-none text-brand-neon font-bold"
                            value={content.hero?.[`stat${i}_val`] || ''}
                            onChange={(e) => handleChange('hero', `stat${i}_val`, e.target.value)}
                            placeholder="Valor"
                         />
                         <input 
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2 focus:border-brand-neon outline-none text-xs text-white/40"
                            value={content.hero?.[`stat${i}_label`] || ''}
                            onChange={(e) => handleChange('hero', `stat${i}_label`, e.target.value)}
                            placeholder="Rótulo"
                         />
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* Contato */}
        <div className="glass-panel p-8 rounded-[2rem] space-y-8 relative overflow-hidden">
           {successSection === 'contact' && <div className="absolute inset-0 bg-brand-neon/10 backdrop-blur-sm flex items-center justify-center z-10 animate-in fade-in duration-300"><div className="bg-brand-neon text-brand-black px-6 py-3 rounded-full font-bold shadow-lg">Alterações Salvas!</div></div>}
           <div className="flex items-center justify-between border-b border-brand-neon/10 pb-4 mb-4">
              <div className="flex items-center gap-3 text-brand-neon">
                <Link2 size={20} />
                <h3 className="font-bold uppercase tracking-widest text-sm">Informações de Contato</h3>
              </div>
              <button 
                onClick={() => handleSaveSection('contact')}
                className="bg-brand-neon/10 hover:bg-brand-neon text-brand-neon hover:text-brand-black px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Save size={14} /> Salvar Contato
              </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black uppercase text-white/40 mb-3">Telefone</label>
                <input 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none"
                  value={content.contact?.phone || ''}
                  onChange={(e) => handleChange('contact', 'phone', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-white/40 mb-3">E-mail</label>
                <input 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none"
                  value={content.contact?.email || ''}
                  onChange={(e) => handleChange('contact', 'email', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-white/40 mb-3">Localização</label>
                <input 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none"
                  value={content.contact?.location || ''}
                  onChange={(e) => handleChange('contact', 'location', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-white/40 mb-3">WhatsApp URL</label>
                <input 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none font-mono text-xs"
                  value={content.contact?.whatsapp_url || ''}
                  onChange={(e) => handleChange('contact', 'whatsapp_url', e.target.value)}
                />
              </div>
           </div>
        </div>

        {/* Footer */}
        <div className="glass-panel p-8 rounded-[2rem] space-y-8 relative overflow-hidden">
           {successSection === 'footer' && <div className="absolute inset-0 bg-brand-neon/10 backdrop-blur-sm flex items-center justify-center z-10 animate-in fade-in duration-300"><div className="bg-brand-neon text-brand-black px-6 py-3 rounded-full font-bold shadow-lg">Alterações Salvas!</div></div>}
           <div className="flex items-center justify-between border-b border-brand-neon/10 pb-4 mb-4">
              <div className="flex items-center gap-3 text-brand-neon">
                <LogOut size={20} className="rotate-90" />
                <h3 className="font-bold uppercase tracking-widest text-sm">Rodapé (Footer)</h3>
              </div>
              <button 
                onClick={() => handleSaveSection('footer')}
                className="bg-brand-neon/10 hover:bg-brand-neon text-brand-neon hover:text-brand-black px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Save size={14} /> Salvar Rodapé
              </button>
           </div>
           <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase text-white/40 mb-3">Copyright Text</label>
                <input 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none"
                  value={content.footer?.copyright || ''}
                  onChange={(e) => handleChange('footer', 'copyright', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-white/40 mb-3">Descrição Curta</label>
                <textarea 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 focus:border-brand-neon outline-none"
                  value={content.footer?.description || ''}
                  onChange={(e) => handleChange('footer', 'description', e.target.value)}
                />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ManagePlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchPlans = () => {
    setLoading(true);
    safeFetch(`/api/plans?t=${Date.now()}`)
      .then(data => {
        setPlans(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading plans:', err);
        setPlans([]);
        setLoading(false);
      });
  };

  useEffect(fetchPlans, []);

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await safeFetch(`/api/admin/plans/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDeletingId(null);
      fetchPlans();
    } catch (error: any) {
      console.error('Delete plan error:', error);
      alert(`Erro ao excluir plano: ${error.message}`);
    }
  };

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const data: any = Object.fromEntries(formData);
    
    // Format numeric and boolean fields
    data.is_featured = form.is_featured.checked ? 1 : 0;
    data.order_index = parseInt(data.order_index) || 0;
    
    // Map highlight_color_text back to highlight_color if it was used
    if (data.highlight_color_text) data.highlight_color = data.highlight_color_text;

    const method = editingPlan?.id ? 'PUT' : 'POST';
    const url = editingPlan?.id ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';

    try {
      await safeFetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      setEditingPlan(null);
      fetchPlans();
    } catch (error: any) {
      console.error('Save plan error:', error);
      alert(`Erro ao salvar plano: ${error.message || 'Verifique os dados'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading && plans.length === 0) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-neon" /></div>;

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tighter">Planos e <span className="text-brand-neon">Pacotes</span></h2>
        <button 
          onClick={() => setEditingPlan({ highlight_color: '#00FF88', cta_text: 'Contratar plano', cta_url: '#contato', is_featured: 0, order_index: plans.length })}
          className="bg-brand-neon text-brand-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all text-sm"
        >
          <Plus size={18} /> Novo Plano
        </button>
      </div>

      <AnimatePresence>
        {editingPlan && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel p-8 rounded-[2.5rem] border-brand-neon/30 relative"
          >
            {saving && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-[2.5rem]">
                <Loader2 className="animate-spin text-brand-neon" size={48} />
              </div>
            )}
            <form onSubmit={savePlan} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Nome do Plano</label>
                  <input name="name" defaultValue={editingPlan.name} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Badge (Destaque)</label>
                  <input name="badge_text" defaultValue={editingPlan.badge_text} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" placeholder="Ex: ★ Mais Popular, Recomendado" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-white/40 mb-3">Descrição Curta</label>
                <input name="description" defaultValue={editingPlan.description} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                 <div className="md:col-span-1">
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Preço (Ex: R$ 890)</label>
                  <input name="price" defaultValue={editingPlan.price} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" required />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Orçamento (Texto)</label>
                  <input name="budget_text" defaultValue={editingPlan.budget_text} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" placeholder="Ex: Sob consulta" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Período (Ex: por evento)</label>
                  <input name="period" defaultValue={editingPlan.period} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-white/40 mb-3">Recursos (Separados por vírgula)</label>
                <textarea name="features" defaultValue={editingPlan.features} className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 focus:border-brand-neon outline-none min-h-[100px]" placeholder="Internet 50 Mbps, Wi-Fi 5, Suporte..." required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Cor de Destaque (Hex)</label>
                  <div className="flex gap-4">
                    <input 
                      name="highlight_color" 
                      type="color" 
                      defaultValue={editingPlan.highlight_color || '#00FF88'} 
                      className="w-14 h-14 bg-transparent border-none outline-none cursor-pointer" 
                      onChange={(e) => {
                        const form = e.target.closest('form');
                        if (form) (form.elements.namedItem('highlight_color_text') as HTMLInputElement).value = e.target.value;
                      }}
                    />
                    <input 
                      name="highlight_color_text" 
                      defaultValue={editingPlan.highlight_color || '#00FF88'} 
                      className="flex-grow bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none uppercase font-mono text-xs" 
                      onChange={(e) => {
                        const form = e.target.closest('form');
                        if (form) (form.elements.namedItem('highlight_color') as HTMLInputElement).value = e.target.value;
                      }} 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Texto do Botão</label>
                  <input name="cta_text" defaultValue={editingPlan.cta_text || 'Contratar plano'} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Link do Botão (URL ou ID)</label>
                  <input name="cta_url" defaultValue={editingPlan.cta_url || '#contato'} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex items-center gap-6 bg-white/5 p-6 rounded-3xl border border-white/5 self-end">
                   <input 
                    name="is_featured" 
                    id="is_featured"
                    type="checkbox" 
                    defaultChecked={editingPlan.is_featured === 1} 
                    className="w-6 h-6 rounded-lg bg-black border-white/20 text-brand-neon focus:ring-brand-neon cursor-pointer" 
                   />
                   <div>
                     <label htmlFor="is_featured" className="block text-sm font-bold text-white mb-1 cursor-pointer">Destacar este plano?</label>
                     <p className="text-[10px] text-white/40 font-medium">Borda brilhante e botão preenchido</p>
                   </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Ordem de Exibição</label>
                  <input name="order_index" type="number" defaultValue={editingPlan.order_index} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" disabled={saving} className="bg-brand-neon text-brand-black px-8 py-4 rounded-2xl font-bold flex items-center gap-2 disabled:opacity-50">
                   <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button type="button" onClick={() => setEditingPlan(null)} className="bg-white/5 px-8 py-4 rounded-2xl font-bold hover:bg-white/10">Cancelar</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {!Array.isArray(plans) || plans.length === 0 && !loading ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
             <Package size={48} className="mx-auto text-white/10 mb-4" />
             <p className="text-white/40 font-medium">Nenhum plano cadastrado ainda.</p>
          </div>
        ) : (
          Array.isArray(plans) && plans.map(plan => (
            <div key={plan.id} className="glass-panel p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-white/20 transition-all" style={plan.is_featured ? { borderLeft: `4px solid ${plan.highlight_color}` } : {}}>
              <div className="flex items-center gap-6">
                 <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center transition-colors" style={{ color: plan.highlight_color }}>
                    <Package size={28} />
                 </div>
                 <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-bold">{plan.name}</h4>
                      {plan.badge_text && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: `${plan.highlight_color}20`, color: plan.highlight_color }}>{plan.badge_text}</span>}
                      {plan.is_featured === 1 && <Zap size={14} className="text-yellow-400 fill-yellow-400" />}
                    </div>
                    <p className="text-white/40 text-sm mb-2">{plan.description}</p>
                    <div className="flex flex-wrap gap-2">
                       {plan.features?.split(',').slice(0, 3).map((f: string, i: number) => (
                         <span key={i} className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-white/30 uppercase font-black">{f.trim()}</span>
                       ))}
                       {plan.features?.split(',').length > 3 && <span className="text-[9px] text-white/20">+{plan.features.split(',').length - 3} mais</span>}
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right mr-4 hidden md:block">
                   <div className="text-xs uppercase font-black text-white/20">Valor</div>
                   <div className="font-bold" style={{ color: plan.highlight_color }}>{plan.budget_text || plan.price}</div>
                   <div className="text-[10px] text-white/20 uppercase font-bold">{plan.period}</div>
                </div>
                {deletingId === plan.id ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                    <button 
                      onClick={() => handleDelete(plan.id)}
                      className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg"
                    >
                      Sim
                    </button>
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="px-4 py-2 bg-white/10 text-white text-xs font-bold rounded-xl hover:bg-white/20 transition-all"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setEditingPlan(plan)} className="p-3 bg-white/5 rounded-xl hover:bg-brand-blue/20 hover:text-brand-blue transition-all">
                       <Pencil size={18} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Botão excluir plano clicado. ID:', plan.id);
                        setDeletingId(plan.id);
                      }} 
                      className="p-3 bg-white/5 rounded-xl hover:bg-red-500/20 hover:text-red-500 transition-all relative z-10"
                      title="Excluir Plano"
                    >
                       <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SecuritySettings() {
  const [user, setUser] = useState<any>(null);
  const [setupData, setSetupData] = useState<any>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConfirmingDisable, setIsConfirmingDisable] = useState(false);

  const fetchUser = async () => {
    try {
      const data = await safeFetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setUser(data);
    } catch (err) {
      console.error('Error fetching user:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleSetup = async () => {
    try {
      const data = await safeFetch('/api/auth/setup-2fa', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setSetupData(data);
    } catch (err: any) {
      console.error('2FA setup error:', err);
      alert(`Erro ao configurar 2FA: ${err.message}`);
    }
  };

  const handleEnable = async () => {
    try {
      await safeFetch('/api/auth/enable-2fa', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code })
      });
      setSetupData(null);
      fetchUser();
    } catch (err: any) {
      setError(err.message || 'Código inválido');
    }
  };

  const handleDisable = async () => {
    try {
      await safeFetch('/api/auth/disable-2fa', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setIsConfirmingDisable(false);
      fetchUser();
    } catch (err: any) {
      console.error('2FA disable error:', err);
      alert(`Erro ao desativar 2FA: ${err.message}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-neon" /></div>;

  return (
    <div className="space-y-12">
      <h2 className="text-3xl font-black tracking-tighter">Segurança <span className="text-brand-neon">& 2FA</span></h2>
      
      <div className="glass-panel p-10 rounded-[3rem] max-w-2xl">
         <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-brand-neon/10 rounded-2xl flex items-center justify-center text-brand-neon">
               <Shield size={32} />
            </div>
            <div>
               <h3 className="text-xl font-bold">Autenticação de Dois Fatores</h3>
               <p className="text-white/40 text-sm">Adicione uma camada extra de proteção ao seu painel.</p>
            </div>
         </div>

         {user?.two_factor_enabled ? (
            <div className="space-y-8">
              <div className="p-8 bg-brand-neon/10 border border-brand-neon/30 rounded-3xl flex items-center gap-6">
                <div className="w-10 h-10 bg-brand-neon rounded-full flex items-center justify-center text-brand-black">
                   <Shield size={20} />
                </div>
                <p className="font-bold text-brand-neon uppercase tracking-widest text-xs">2FA Ativado com Sucesso</p>
              </div>
              
              <div className="pt-6 border-t border-white/5">
                <p className="text-white/40 text-sm mb-6 font-medium">Você está usando o Google Authenticator para proteger sua conta.</p>
                
                {isConfirmingDisable ? (
                  <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl space-y-4">
                    <p className="text-sm font-bold text-red-500">Tem certeza? Isso reduzirá a segurança da sua conta.</p>
                    <div className="flex gap-4">
                      <button 
                        onClick={handleDisable}
                        className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all"
                      >
                        Confirmar Desativação
                      </button>
                      <button 
                        onClick={() => setIsConfirmingDisable(false)}
                        className="text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsConfirmingDisable(true)} 
                    className="text-red-500/60 hover:text-red-500 text-xs font-bold uppercase tracking-widest border-b border-red-500/20 hover:border-red-500 transition-all pb-1"
                  >
                    Desativar Verificação em Duas Etapas
                  </button>
                )}
              </div>
            </div>
         ) : !setupData ? (
           <button onClick={handleSetup} className="bg-brand-neon text-brand-black px-10 py-5 rounded-2xl font-bold hover:scale-105 transition-all shadow-lg neon-glow">
              Configurar Google Authenticator
           </button>
         ) : (
           <div className="space-y-10 animate-in fade-in slide-in-from-top-4">
              <div className="p-8 bg-white rounded-[2rem] inline-block mb-4 shadow-2xl">
                 <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              <div className="p-6 bg-black/40 border border-white/10 rounded-3xl">
                 <p className="text-sm text-white/60 mb-6">1. Escaneie o QR Code acima no aplicativo Google Authenticator.<br/>2. Digite o código de 6 dígitos gerado:</p>
                 <div className="flex gap-4">
                    <input 
                      type="text" 
                      maxLength={6} 
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      className="bg-black border border-white/20 rounded-xl px-6 py-4 focus:border-brand-neon outline-none flex-grow font-mono text-xl tracking-[0.3em] text-center"
                      placeholder="000000"
                    />
                    <button onClick={handleEnable} className="bg-brand-neon text-brand-black px-8 py-4 rounded-xl font-bold">Ativar</button>
                 </div>
                 {error && <p className="text-red-500 text-xs font-bold mt-4 animate-pulse">{error}</p>}
              </div>
              <button onClick={() => setSetupData(null)} className="text-white/30 text-xs font-bold uppercase tracking-widest hover:text-white transition-all">Cancelar</button>
           </div>
         )}
      </div>
    </div>
  );
}

function ManageServices() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedIcon, setSelectedIcon] = useState('Wifi');

  const iconOptions = [
    { name: 'Wifi', icon: Wifi },
    { name: 'Globe', icon: Globe },
    { name: 'Zap', icon: Zap },
    { name: 'Satellite', icon: Satellite },
    { name: 'Camera', icon: Camera },
    { name: 'Video', icon: Video },
    { name: 'Battery', icon: Battery },
    { name: 'Database', icon: Database },
    { name: 'Headset', icon: Headset },
    { name: 'Cpu', icon: Cpu },
    { name: 'HardDrive', icon: HardDrive },
    { name: 'Share2', icon: Share2 },
    { name: 'Radio', icon: Radio },
    { name: 'Link', icon: LinkIcon },
    { name: 'Activity', icon: Activity },
  ];

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchServices = () => {
    safeFetch('/api/services')
      .then(data => {
        setServices(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching services:', err);
        setServices([]);
        setLoading(false);
      });
  };

  useEffect(fetchServices, []);

  useEffect(() => {
    if (editingService) {
      setSelectedIcon(editingService.icon || 'Wifi');
    }
  }, [editingService]);

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await safeFetch(`/api/admin/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDeletingId(null);
      fetchServices();
    } catch (error: any) {
      console.error('Delete service error:', error);
      alert(`Erro ao excluir serviço: ${error.message}`);
    }
  };

  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    
    const payload = { ...data, icon: selectedIcon };
    
    const method = editingService?.id ? 'PUT' : 'POST';
    const url = editingService?.id ? `/api/admin/services/${editingService.id}` : '/api/admin/services';

    try {
      await safeFetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      setEditingService(null);
      fetchServices();
    } catch (err: any) {
      console.error('Save service error:', err);
      alert(`Erro ao salvar serviço: ${err.message}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-neon" /></div>;

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tighter">Gerenciar <span className="text-brand-neon">Serviços</span></h2>
        <button 
          onClick={() => setEditingService({ icon: 'Wifi' })}
          className="bg-brand-neon text-brand-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all text-sm"
        >
          <Plus size={18} /> Novo Serviço
        </button>
      </div>

      <AnimatePresence>
        {editingService && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel p-8 rounded-[2.5rem] border-brand-neon/30"
          >
            <form onSubmit={saveService} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-white/40 mb-3">Título do Serviço</label>
                    <input name="title" defaultValue={editingService.title} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-white/40 mb-3">Descrição</label>
                    <textarea name="description" defaultValue={editingService.description} className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 focus:border-brand-neon outline-none min-h-[100px]" required />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-white/40 mb-3">Ordem de Exibição</label>
                    <input name="order_index" type="number" defaultValue={editingService.order_index} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Escolher Ícone</label>
                  <div className="grid grid-cols-5 gap-3 p-4 bg-black/20 rounded-2xl border border-white/5 max-h-[300px] overflow-y-auto">
                    {iconOptions.map((opt) => (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setSelectedIcon(opt.name)}
                        className={`p-3 rounded-xl flex items-center justify-center transition-all ${selectedIcon === opt.name ? 'bg-brand-neon text-brand-black scale-110' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                        title={opt.name}
                      >
                        <opt.icon size={20} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="bg-brand-neon text-brand-black px-8 py-4 rounded-2xl font-bold flex items-center gap-2">
                   <Save size={18} /> Salvar Serviço
                </button>
                <button type="button" onClick={() => setEditingService(null)} className="bg-white/5 px-8 py-4 rounded-2xl font-bold hover:bg-white/10">Cancelar</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {!Array.isArray(services) || services.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
             <Wifi size={48} className="mx-auto text-white/10 mb-4" />
             <p className="text-white/40 font-medium">Nenhum serviço cadastrado ainda.</p>
          </div>
        ) : (
          services.map(service => {
          const IconComp = iconOptions.find(o => o.name === (service.icon || 'Wifi'))?.icon || Wifi;
          return (
            <div key={service.id} className="glass-panel p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-white/20 transition-all">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 group-hover:text-brand-neon transition-colors">
                    <IconComp size={28} />
                </div>
                <div>
                    <h4 className="text-[1.5rem] font-black bg-gradient-to-r from-brand-neon to-brand-blue bg-clip-text text-transparent">{service.title}</h4>
                    <p className="text-white/40 text-sm">{service.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {deletingId === service.id ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                    <button 
                      onClick={() => handleDelete(service.id)}
                      className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg"
                    >
                      Sim
                    </button>
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="px-4 py-2 bg-white/10 text-white text-xs font-bold rounded-xl hover:bg-white/20 transition-all"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setEditingService(service)} className="p-3 bg-white/5 rounded-xl hover:bg-brand-blue/20 hover:text-brand-blue transition-all">
                      <Pencil size={18} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Botão excluir serviço clicado. ID:', service.id);
                        setDeletingId(service.id);
                      }} 
                      className="p-3 bg-white/5 rounded-xl hover:bg-red-500/20 hover:text-red-500 transition-all relative z-10"
                      title="Excluir Serviço"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        }))}
      </div>
    </div>
  );
}

function ManageInventory() {
  const [items, setItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchCustomers = () => {
    safeFetch('/api/admin/customers', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(data => setCustomers(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching customers for summary in inventory:', err);
        setCustomers([]);
      });
  };

  const fetchItems = () => {
    safeFetch('/api/admin/inventory', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching inventory:', err);
        setItems([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchItems();
    fetchCustomers();
  }, []);

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await safeFetch(`/api/admin/inventory/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDeletingId(null);
      fetchItems();
    } catch (error: any) {
      console.error('Delete inventory error:', error);
      alert(`Erro ao excluir item: ${error.message}`);
    }
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    
    data.price = data.price.toString().replace(',', '.');

    const method = editingItem?.id ? 'PUT' : 'POST';
    const url = editingItem?.id ? `/api/admin/inventory/${editingItem.id}` : '/api/admin/inventory';

    try {
      await safeFetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      setEditingItem(null);
      fetchItems();
    } catch (err: any) {
      console.error('Save item error:', err);
      alert(`Erro ao salvar item: ${err.message}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-neon" /></div>;

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tighter">Gestão de <span className="text-brand-neon">Equipamentos & Ativos</span></h2>
        <button 
          onClick={() => setEditingItem({ status: 'Ativo' })}
          className="bg-brand-neon text-brand-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all text-sm"
        >
          <Plus size={18} /> Novo Item
        </button>
      </div>

      <FinancialSummary customers={customers} inventory={items} />

      <AnimatePresence>
        {editingItem && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel p-8 rounded-[2.5rem] border-brand-neon/30"
          >
            <form onSubmit={saveItem} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Nome do Equipamento</label>
                  <input name="name" defaultValue={editingItem.name} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Marca / Modelo</label>
                  <input name="brand" defaultValue={editingItem.brand} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Data de Compra</label>
                  <div className="relative group">
                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-neon transition-colors pointer-events-none" size={18} />
                    <input name="purchase_date" type="date" defaultValue={editingItem.purchase_date} className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 focus:border-brand-neon outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Número de Serial</label>
                  <input name="serial_number" defaultValue={editingItem.serial_number} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Fornecedor</label>
                  <input name="supplier" defaultValue={editingItem.supplier} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Valor Pago (R$)</label>
                  <input name="price" defaultValue={editingItem.price} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon outline-none" placeholder="Ex: 1500.00" required />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-3">Status</label>
                  <select name="status" defaultValue={editingItem.status || 'Ativo'} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand-neon appearance-none outline-none">
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Manutenção">Manutenção</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="bg-brand-neon text-brand-black px-8 py-4 rounded-2xl font-bold flex items-center gap-2">
                   <Save size={18} /> Salvar Equipamento
                </button>
                <button type="button" onClick={() => setEditingItem(null)} className="bg-white/5 px-8 py-4 rounded-2xl font-bold hover:bg-white/10">Cancelar</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {!Array.isArray(items) || items.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
             <Package size={48} className="mx-auto text-white/10 mb-4" />
             <p className="text-white/40 font-medium">Nenhum equipamento cadastrado ainda.</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="glass-panel p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-white/20 transition-all">
              <div className="flex-grow">
                 <div className="flex items-center gap-4 mb-4">
                    <h4 className="text-xl font-bold">{item.name}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      item.status === 'Ativo' ? 'bg-green-500/10 text-green-500' :
                      item.status === 'Manutenção' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {item.status}
                    </span>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs text-white/40">
                    <div>
                       <span className="block opacity-40 uppercase font-black mb-1">Marca</span>
                       <span className="text-white font-bold">{item.brand || '---'}</span>
                    </div>
                    <div>
                       <span className="block opacity-40 uppercase font-black mb-1">Serial</span>
                       <span className="text-white font-bold">{item.serial_number || '---'}</span>
                    </div>
                    <div>
                       <span className="block opacity-40 uppercase font-black mb-1">Fornecedor</span>
                       <span className="text-white font-bold">{item.supplier || '---'}</span>
                    </div>
                    <div>
                       <span className="block opacity-40 uppercase font-black mb-1">Valor</span>
                       <span className="text-brand-neon font-black">R$ {parseFloat(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                {deletingId === item.id ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDelete(item.id)} className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl">Sim</button>
                    <button onClick={() => setDeletingId(null)} className="px-4 py-2 bg-white/10 text-white text-xs font-bold rounded-xl">Não</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setEditingItem(item)} className="p-3 bg-white/5 rounded-xl hover:bg-brand-blue/20 hover:text-brand-blue transition-all">
                       <Pencil size={18} />
                    </button>
                    <button onClick={() => setDeletingId(item.id)} className="p-3 bg-white/5 rounded-xl hover:bg-red-500/20 hover:text-red-500 transition-all">
                       <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DashboardHome() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      try {
        const [cusData, invData] = await Promise.all([
          safeFetch('/api/admin/customers', { headers }),
          safeFetch('/api/admin/inventory', { headers })
        ]);
        
        setCustomers(Array.isArray(cusData) ? cusData : []);
        setInventory(Array.isArray(invData) ? invData : []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-neon" /></div>;

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-3xl font-black tracking-tighter mb-2">Bem-vindo, <span className="text-brand-neon">Administrador</span></h2>
           <p className="text-white/40 text-sm font-medium">Aqui está um resumo do seu negócio hoje.</p>
        </div>
        <Link to="customers" className="text-brand-neon text-xs font-black uppercase tracking-widest border-b border-brand-neon pb-1 hover:text-white hover:border-white transition-all">Ver todos os clientes</Link>
      </div>

      <FinancialSummary customers={customers} inventory={inventory} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <Link to="analytics" className="glass-panel p-8 rounded-[2.5rem] hover:border-brand-neon/30 transition-all group">
            <div className="w-12 h-12 bg-brand-neon/10 rounded-2xl flex items-center justify-center text-brand-neon mb-4 group-hover:scale-110 transition-transform">
               <BarChart3 size={24} />
            </div>
            <h3 className="text-lg font-bold">Analytics</h3>
         </Link>
         <Link to="inventory" className="glass-panel p-8 rounded-[2.5rem] hover:border-brand-blue/30 transition-all group">
            <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue mb-4 group-hover:scale-110 transition-transform">
               <Package size={24} />
            </div>
            <h3 className="text-lg font-bold">Equipamentos</h3>
         </Link>
         <Link to="customers" className="glass-panel p-8 rounded-[2.5rem] hover:border-white/30 transition-all group">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/40 mb-4 group-hover:scale-110 transition-transform">
               <Users size={24} />
            </div>
            <h3 className="text-lg font-bold">Clientes</h3>
         </Link>
         <Link to="content" className="glass-panel p-8 rounded-[2.5rem] hover:border-white/30 transition-all group">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/40 mb-4 group-hover:scale-110 transition-transform">
               <FileEdit size={24} />
            </div>
            <h3 className="text-lg font-bold">Landing Page</h3>
         </Link>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
             <LayoutDashboard size={120} />
          </div>
          <h4 className="text-xl font-bold mb-4 flex items-center gap-3">
             <Shield className="text-brand-neon" size={24} />
             Dica de Segurança
          </h4>
          <p className="text-white/50 max-w-lg leading-relaxed">
            Recomendamos a ativação do Segundo Fator de Autenticação (2FA) para todos os administradores. Isso garante que, mesmo com a senha descoberta, o acesso permaneça seguro.
          </p>
          <Link to="security" className="inline-block mt-8 text-brand-neon font-bold text-sm border-b border-brand-neon hover:border-transparent transition-all">
             Ir para Configurações de Segurança
          </Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    safeFetch('/api/admin/system-status', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(status => setSystemStatus(status))
      .catch(err => console.error('Status check failed:', err));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Geral', icon: LayoutDashboard, path: '/admin/dashboard' },
    { name: 'Analytics', icon: BarChart3, path: '/admin/dashboard/analytics' },
    { name: 'Clientes', icon: Users, path: '/admin/dashboard/customers' },
    { name: 'Inventário', icon: Package, path: '/admin/dashboard/inventory' },
    { name: 'Landing Page', icon: FileEdit, path: '/admin/dashboard/content' },
    { name: 'Planos', icon: Package, path: '/admin/dashboard/plans' },
    { name: 'Serviços', icon: Wifi, path: '/admin/dashboard/services' },
    { name: 'Segurança', icon: Shield, path: '/admin/dashboard/security' },
  ];

  return (
    <div className="min-h-screen bg-brand-black flex flex-col md:flex-row relative overflow-hidden">
      {/* Background Stars & Mesh */}
      <div className="stars-container"></div>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-neon/10 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-blue/10 rounded-full blur-[140px]"></div>
      </div>

      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-black/40 backdrop-blur-xl md:border-r border-white/10 flex flex-col p-8 z-20 relative">
         <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-brand-neon rounded-lg flex items-center justify-center">
              <LayoutDashboard className="text-brand-black" size={24} />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">Painel <span className="text-brand-neon">Admin</span></span>
         </div>

         <nav className="flex-grow space-y-3">
            {navItems.map(item => (
              <Link 
                key={item.name}
                to={item.path}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${location.pathname === item.path ? 'bg-brand-neon text-brand-black' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            ))}
         </nav>

         <div className="pt-8 border-t border-white/5">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-red-500/60 hover:bg-red-500/10 hover:text-red-500 transition-all"
            >
              <LogOut size={20} />
              Sair da Conta
            </button>
         </div>
      </aside>

      {/* Content */}
      <main className="flex-grow p-8 md:p-16 h-screen overflow-y-auto relative z-10">
         <div className="max-w-4xl mx-auto">
            {systemStatus && systemStatus.isVercel && !systemStatus.supabase?.active && (
              <div className="mb-8 p-6 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-top duration-700">
                <div className="p-3 bg-red-500/20 rounded-2xl text-red-500">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-500 mb-1">Atenção: Banco de Dados Não Persistente</h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-3">
                    O Supabase não foi detectado ou configurado. Em modo produção (Vercel), as alterações que você fizer serão **perdidas** assim que o servidor reiniciar.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Erro de persistência</span>
                    <span className="text-[10px] text-white/30 italic">Verifique as variáveis SUPABASE_URL e SUPABASE_ANON_KEY no Vercel.</span>
                  </div>
                </div>
              </div>
            )}

            {systemStatus && systemStatus.supabase?.active && (
              <div className="mb-8 p-4 bg-brand-neon/5 border border-brand-neon/10 rounded-2xl flex items-center gap-3">
                <div className="w-2 h-2 bg-brand-neon rounded-full animate-pulse shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-neon/60">Cloud Sync Ativo: Supabase Conectado</span>
              </div>
            )}

            <Routes>
              <Route path="/" element={<DashboardHome />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="customers" element={<ManageCustomers />} />
              <Route path="inventory" element={<ManageInventory />} />
              <Route path="content" element={<EditContent />} />
              <Route path="plans" element={<ManagePlans />} />
              <Route path="services" element={<ManageServices />} />
              <Route path="security" element={<SecuritySettings />} />
            </Routes>
         </div>
      </main>
    </div>
  );
}
