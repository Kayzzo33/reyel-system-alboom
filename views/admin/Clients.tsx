
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ICONS } from '../../constants';
import Button from '../../components/ui/Button';
import { Client } from '../../types';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState({ nome: '', email: '', whatsapp: '' });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('clients').select('*').order('nome');
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async () => {
    if (!newClient.nome || !newClient.email) {
      alert("Nome e E-mail são obrigatórios.");
      return;
    }
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("Sessão expirada.");
      const payload = {
        nome: newClient.nome,
        email: newClient.email,
        whatsapp: newClient.whatsapp,
        photographer_id: user.id
      };
      const { error } = await supabase.from('clients').insert([payload]);
      if (error) throw error;
      setIsModalOpen(false);
      setNewClient({ nome: '', email: '', whatsapp: '' });
      fetchClients();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients.filter(client => 
    client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Meus Clientes</h2>
          <p className="text-slate-500 font-medium">Histórico e contatos de quem valoriza sua arte.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative group flex-1 md:flex-none">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-500">{ICONS.Search}</span>
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-4 bg-[#0a0a0a] border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-red-600/30 w-full md:w-64 font-bold text-sm"
            />
          </div>
          <Button variant="primary" className="rounded-2xl px-8 py-4 font-black uppercase text-[10px] tracking-widest shadow-xl" onClick={() => setIsModalOpen(true)}>
            {ICONS.Plus} Novo Cadastro
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-[#0a0a0a] border border-white/5 rounded-3xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="w-full">
          <div className="hidden lg:block bg-[#0a0a0a] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-black/20 border-b border-white/5">
                <tr>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Cliente</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">E-mail</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">WhatsApp</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black text-slate-600 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-sm border border-emerald-500/10 shadow-inner">
                          {client.nome.charAt(0)}
                        </div>
                        <span className="text-base font-black text-white tracking-tight">{client.nome}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-sm text-slate-500 font-bold">{client.email}</td>
                    <td className="px-10 py-6 text-sm text-emerald-500 font-black tracking-widest">{client.whatsapp || '--'}</td>
                    <td className="px-10 py-6 text-right">
                      <button className="p-3 text-slate-600 hover:text-white transition-all bg-white/5 rounded-xl">{ICONS.View}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden grid gap-4">
            {filteredClients.map(client => (
              <div key={client.id} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[2.5rem] shadow-xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-base border border-emerald-500/20">
                    {client.nome.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-black text-white leading-none tracking-tight">{client.nome}</h4>
                    <p className="text-[10px] text-slate-600 font-black uppercase mt-1 tracking-widest truncate max-w-[180px]">{client.email}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                   <div className="text-[11px] font-black text-emerald-500 tracking-widest">{client.whatsapp || 'SEM NÚMERO'}</div>
                   <button className="p-3 bg-white/5 rounded-xl text-slate-600">{ICONS.View}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/5 w-full max-w-lg rounded-[3rem] p-8 md:p-12 shadow-3xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">{ICONS.Back}</button>
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Novo Cadastro</h3>
                <p className="text-slate-600 text-xs font-bold mt-2 uppercase tracking-widest">Adicione um novo cliente à sua base.</p>
              </div>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Maria Oliveira" 
                    className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/40" 
                    value={newClient.nome} 
                    onChange={e => setNewClient({...newClient, nome: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">E-mail</label>
                  <input 
                    type="email" 
                    placeholder="maria@exemplo.com" 
                    className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/40" 
                    value={newClient.email} 
                    onChange={e => setNewClient({...newClient, email: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">WhatsApp (DDD)</label>
                  <input 
                    type="text" 
                    placeholder="11999999999" 
                    className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-emerald-500 font-black outline-none focus:ring-1 focus:ring-emerald-500/40" 
                    value={newClient.whatsapp} 
                    onChange={e => setNewClient({...newClient, whatsapp: e.target.value})} 
                  />
                </div>
              </div>
              
              <Button variant="primary" className="w-full py-5 rounded-2xl font-black uppercase text-xs" isLoading={saving} onClick={handleSaveClient}>
                Salvar Cadastro
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
