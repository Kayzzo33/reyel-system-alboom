
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ICONS, COLORS } from '../../constants';
import Button from '../../components/ui/Button';

interface OrderGroup {
  album_id: string;
  client_id: string;
  album_nome: string;
  client_nome: string;
  client_whatsapp: string;
  photo_count: number;
  preco_por_foto: number;
  latest_date: string;
  photos: string[]; // URLs ou IDs
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Busca seleções com joins
      const { data, error } = await supabase
        .from('selections')
        .select(`
          id,
          created_at,
          albums (id, nome_galeria, preco_por_foto),
          clients (id, nome, whatsapp),
          photo_id
        `);

      if (error) throw error;

      // Agrupar seleções por Álbum + Cliente no Frontend
      const groups: { [key: string]: OrderGroup } = {};

      data?.forEach((sel: any) => {
        const key = `${sel.albums.id}-${sel.clients.id}`;
        if (!groups[key]) {
          groups[key] = {
            album_id: sel.albums.id,
            client_id: sel.clients.id,
            album_nome: sel.albums.nome_galeria,
            client_nome: sel.clients.nome,
            client_whatsapp: sel.clients.whatsapp,
            preco_por_foto: sel.albums.preco_por_foto,
            photo_count: 0,
            latest_date: sel.created_at,
            photos: []
          };
        }
        groups[key].photo_count += 1;
        groups[key].photos.push(sel.photo_id);
      });

      setOrders(Object.values(groups).sort((a, b) => new Date(b.latest_date).getTime() - new Date(a.latest_date).getTime()));
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChargeWhatsApp = (order: OrderGroup) => {
    const total = (order.photo_count * order.preco_por_foto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const message = `Olá ${order.client_nome}! 👋%0A%0AVi que você finalizou a seleção de *${order.photo_count} fotos* no álbum *${order.album_nome}*.%0A%0AO valor total da sua seleção é de *${total}*.%0A%0AVou te enviar minha chave PIX para concluirmos. Aguardo o comprovante para liberar o download! 📸`;
    
    const whatsappUrl = `https://wa.me/55${order.client_whatsapp.replace(/\D/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDeleteSelections = async (order: OrderGroup) => {
    if (!confirm(`Deseja limpar as seleções de ${order.client_nome} para este álbum?`)) return;
    try {
      const { error } = await supabase
        .from('selections')
        .delete()
        .eq('album_id', order.album_id)
        .eq('client_id', order.client_id);
      
      if (error) throw error;
      fetchOrders();
    } catch (err) {
      alert("Erro ao excluir.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-white tracking-tight">Seleções e Pedidos</h2>
        <p className="text-slate-400">Acompanhe as escolhas dos clientes e gerencie as cobranças.</p>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-32 bg-slate-900 rounded-[2rem] animate-pulse"></div>)}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-24 text-center bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600">{ICONS.Orders}</div>
          <p className="text-slate-500 font-medium">Nenhuma seleção finalizada até o momento.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map((order, idx) => (
            <div key={idx} className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 hover:border-[#d4af37]/30 transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-[#d4af37]/10 text-[#d4af37] rounded-2xl flex items-center justify-center font-black text-xl">
                  {order.photo_count}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-[#d4af37] transition-colors">{order.client_nome}</h3>
                  <p className="text-slate-500 text-sm font-medium">Álbum: <span className="text-slate-300">{order.album_nome}</span></p>
                  <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-1">
                    {new Date(order.latest_date).toLocaleDateString('pt-BR')} às {new Date(order.latest_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center md:items-end gap-2">
                <p className="text-2xl font-black text-white">
                  {(order.photo_count * order.preco_por_foto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleDeleteSelections(order)}
                    className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    title="Excluir Seleção"
                  >
                    {ICONS.Delete}
                  </button>
                  <Button 
                    variant="primary" 
                    className="rounded-xl px-6 font-bold flex items-center gap-2"
                    onClick={() => handleChargeWhatsApp(order)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.819c1.556.925 3.129 1.411 4.799 1.412 5.303 0 9.613-4.31 9.615-9.613.001-2.569-1.002-4.984-2.825-6.808-1.823-1.824-4.238-2.827-6.81-2.827-5.303 0-9.613 4.31-9.615 9.614-.001 1.834.52 3.488 1.503 5.013l-.934 3.414 3.52-.922zm11.363-5.062c-.312-.156-1.848-.912-2.134-1.017-.286-.105-.494-.156-.701.156-.207.312-.803 1.017-.984 1.223-.182.206-.363.231-.675.075-.312-.156-1.316-.484-2.508-1.547-.926-.826-1.551-1.847-1.733-2.159-.182-.312-.019-.481.137-.636.141-.14.312-.363.468-.544.156-.182.208-.312.312-.519.104-.207.052-.389-.026-.544-.078-.156-.701-1.687-.961-2.312-.253-.609-.51-.525-.701-.535-.181-.01-.389-.012-.597-.012s-.545.078-.83.389c-.286.312-1.09.1.066-1.09 2.312s.804 1.503 1.037 1.815c.234.312 3.033 4.631 7.348 6.494.103.1.201.21.298.318.847.788 1.68 1.14 2.308 1.047.701-.104 2.134-.872 2.433-1.716.3-.843.3-1.562.208-1.716-.092-.154-.34-.247-.652-.403z"/></svg>
                    Cobrar WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
