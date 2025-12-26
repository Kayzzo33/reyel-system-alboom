
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ICONS, COLORS } from '../../constants';
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
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('nome');
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async () => {
    if (!newClient.nome || !newClient.email) return;
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('clients').insert([{
        ...newClient,
        photographer_id: user?.id
      }]);
      if (error) throw error;
      setIsModalOpen(false);
      setNewClient({ nome: '', email: '', whatsapp: '' });
      fetchClients();
    } catch (err) {
      alert('Erro ao salvar cliente');
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
          <h2 className="text-3xl font-bold text-white">Seus Clientes</h2>
          <p className="text-slate-400">Gerencie sua base de contatos para vincular aos álbuns.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative group">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">{ICONS.Search}</span>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 w-full md:w-64 transition-all"
            />
          </div>
          <Button variant="primary" className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
            {ICONS.Plus} Novo Cliente
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full">
            <thead className="bg-slate-950/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Nome</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">E-mail</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">WhatsApp</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#d4af37]/10 text-[#d4af37] flex items-center justify-center font-bold text-sm">
                        {client.nome.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-white">{client.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{client.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{client.whatsapp || '--'}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-500 hover:text-white transition-colors">{ICONS.View}</button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">Nenhum cliente cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6">Cadastrar Cliente</h3>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome Completo</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
                  value={newClient.nome}
                  onChange={(e) => setNewClient({...newClient, nome: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">E-mail</label>
                <input 
                  type="email" 
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">WhatsApp</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
                  placeholder="(00) 00000-0000"
                  value={newClient.whatsapp}
                  onChange={(e) => setNewClient({...newClient, whatsapp: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <Button variant="ghost" className="flex-1 rounded-2xl" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" className="flex-1 rounded-2xl" isLoading={saving} onClick={handleSaveClient}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
