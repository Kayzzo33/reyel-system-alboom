
import React from 'react';
import { ICONS, COLORS } from '../../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.Dashboard },
    { id: 'albums', label: 'Álbuns', icon: ICONS.Albums },
    { id: 'clients', label: 'Clientes', icon: ICONS.Clients },
    { id: 'orders', label: 'Pedidos', icon: ICONS.Orders },
    { id: 'config', label: 'Configurações', icon: ICONS.Config },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed left-0 top-0 h-screen bg-[#050505] border-r border-white/5 z-[70] transition-transform duration-300
        w-64 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-10 flex items-center justify-between">
          <h1 className="text-2xl font-black text-white tracking-tighter">
            REYEL<span className="text-red-600">PROD</span>
          </h1>
          <button onClick={onClose} className="lg:hidden text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <nav className="flex-1 px-6 py-4 space-y-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-red-600 text-white font-black shadow-2xl shadow-red-900/40 scale-105' 
                  : 'text-slate-600 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={activeTab === item.id ? 'text-white' : 'text-slate-600'}>{item.icon}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-black">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5">
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-4 px-5 py-4 rounded-2xl text-red-600/60 hover:bg-red-600 hover:text-white transition-all font-black uppercase text-[10px] tracking-widest"
          >
            {ICONS.Logout}
            <span>Sair do Sistema</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
