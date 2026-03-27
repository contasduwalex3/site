import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, MessageSquare, Settings, Zap, X, Shield } from './Icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/products', icon: <Package size={20} />, label: 'Produtos' },
    { to: '/automation', icon: <Zap size={20} />, label: 'Automação' },
    { to: '/copies', icon: <MessageSquare size={20} />, label: 'Copies' },
    { to: '/settings?tab=affiliate', icon: <Shield size={20} />, label: 'Afiliado' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Configurações' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-zinc-950 border-r border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <Zap className="text-black" size={20} fill="currentColor" />
            </div>
            <h1 className="text-xl font-bold tracking-tighter text-white">AFILIAUTO <span className="text-yellow-400">PRO</span></h1>
          </div>
          <button onClick={onClose} className="lg:hidden text-zinc-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-yellow-400 text-black font-semibold' 
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800 mt-auto">
          <div className="bg-zinc-900 p-4 rounded-2xl">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-2">Status do Sistema</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-zinc-300">Online & Ativo</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
