
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
      
      if (!user) {
        alert("Sessão expirada. Faça login novamente.");
        return;
      }

      console.log("Iniciando inserção de cliente...");
      const payload = {
        nome: newClient.nome,
        email: newClient.email,
        whatsapp: newClient.whatsapp,
        photographer_id: user.id
      };
      
      console.log("Payload enviado:", payload);
      
      const { data, error } = await supabase.from('clients').insert([payload]).select();

      if (error) {
        console.error("ERRO SUPABASE (RLS ou Schema):", error);
        throw error;
      }

      console.log("Cliente salvo com sucesso:", data);
      setIsModalOpen(false);
      setNewClient({ nome: '', email: '', whatsapp: '' });
      fetchClients();
      alert("Cliente cadastrado!");
    } catch (err: any) {
      console.error("Erro detalhado no handleSaveClient:", err);
      // Se for erro de RLS, dar uma dica ao usuário
      if (err.code === '42501') {
        alert("Erro de Permissão (RLS): O banco de dados bloqueou o cadastro. Verifique as políticas de segurança da tabela 'clients' no Supabase.");
      } else {
        alert(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients.filter(client => 
    client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Clientes</h2>
          <p className="text-slate-400">Base de contatos e histórico de seleções.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative group">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">{ICONS.Search}</span>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 w-full md:w-64 transition-all"
            />
          </div>
          <Button variant="primary" className="rounded-xl px-6" onClick={() => setIsModalOpen(true)}>
            {ICONS.Plus} Novo Cliente
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-slate-950/50 border-b border-white/5">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">E-mail</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">WhatsApp</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 text-[#d4af37] flex items-center justify-center font-black text-xs ring-1 ring-[#d4af37]/20">
                        {client.nome.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-white">{client.nome}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm text-slate-400 font-medium">{client.email}</td>
                  <td className="px-8 py-5 text-sm text-slate-400 font-medium">{client.whatsapp || '--'}</td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-white/5 rounded-lg">{ICONS.View}</button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-slate-600 italic font-medium">Nenhum cliente encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
            <div className="mb-8">
              <h3 className="text-2xl font-black text-white tracking-tighter">Novo Cliente</h3>
              <p className="text-slate-500 text-sm mt-1 font-medium">Cadastre os dados para vincular aos álbuns.</p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 placeholder-slate-700 font-bold"
                  value={newClient.nome}
                  onChange={(e) => setNewClient({...newClient, nome: e.target.value})}
                  placeholder="Ex: Maria Oliveira"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                <input 
                  type="email" 
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 placeholder-slate-700 font-bold"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  placeholder="maria@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 placeholder-slate-700 font-bold"
                  placeholder="(00) 00000-0000"
                  value={newClient.whatsapp}
                  onChange={(e) => setNewClient({...newClient, whatsapp: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <Button variant="ghost" className="flex-1 rounded-2xl py-4" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" className="flex-1 rounded-2xl font-bold py-4" isLoading={saving} onClick={handleSaveClient}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
