import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Receipt, 
  Target, 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Users, 
  ShoppingBag, 
  Smartphone, 
  Eye, 
  LogOut, 
  X, 
  Menu 
} from 'lucide-react';
import { ViewType } from '../types';

interface Props {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  isAdmin: boolean;
  isDemoMode: boolean;
  currentUserKey: string;
  onLogout: () => void;
  onEnterDemo: () => void;
  onExitDemo: () => void;
}

const Sidebar: React.FC<Props> = ({ 
  activeView, 
  setActiveView, 
  mobileMenuOpen, 
  setMobileMenuOpen, 
  isAdmin, 
  isDemoMode, 
  currentUserKey,
  onLogout,
  onEnterDemo,
  onExitDemo
}) => {
  
  const menuItems = [
     { type: 'header', label: 'VISÃO GERAL' },
     { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
     { id: 'sms', label: 'SMS RUSH', icon: Smartphone, badge: 'NOVO' },
     { type: 'header', label: 'FINANCEIRO' },
     { id: 'planejamento', label: 'Planejamento', icon: Target },
     { id: 'controle', label: 'Controle Diário', icon: CalendarDays },
     { id: 'despesas', label: 'Despesas', icon: Receipt },
     { id: 'metas', label: 'Metas', icon: SettingsIcon },
     { type: 'header', label: 'FERRAMENTAS' },
     { id: 'slots', label: 'Slots Radar', icon: ActivityIcon },
     { id: 'squad', label: 'Squad', icon: Users },
     { id: 'store', label: 'Loja Oficial', icon: ShoppingBag },
     { type: 'header', label: 'SISTEMA' },
     ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
     { id: 'configuracoes', label: 'Ajustes', icon: SettingsIcon },
  ];

  return (
    <>
        {/* Overlay Escuro para Mobile */}
        {mobileMenuOpen && (
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden"
                onClick={() => setMobileMenuOpen(false)}
            />
        )}

        <nav className={`fixed md:relative z-[60] w-[80%] max-w-[300px] md:w-20 lg:w-64 h-full bg-[#05030a] md:bg-transparent border-r border-white/5 flex flex-col transition-transform duration-300 shadow-2xl md:shadow-none ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1 custom-scrollbar">
                {menuItems.map((item: any, index) => {
                    if (item.type === 'header') return <div key={`header-${index}`} className="pt-4 pb-2 px-2"><p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{item.label}</p></div>;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => { setActiveView(item.id as ViewType); setMobileMenuOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative overflow-hidden ${activeView === item.id ? 'text-white font-bold bg-white/[0.03]' : 'text-gray-500 hover:text-white hover:bg-white/[0.02]'}`}
                            aria-label={`Navegar para ${item.label}`}
                        >
                            {activeView === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(112,0,255,0.5)]"></div>}
                            <div className={`transition-transform duration-300 ${activeView === item.id ? 'translate-x-2 text-primary' : ''}`}><Icon size={18} /></div>
                            <span className={`text-sm md:hidden lg:block transition-transform duration-300 ${activeView === item.id ? 'translate-x-2' : ''}`}>{item.label}</span>
                            {item.badge === 'NOVO' && <span className="ml-auto flex items-center gap-1.5 md:hidden lg:flex"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span></span><span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">NOVO</span></span>}
                        </button>
                    );
                })}
            </div>
            <div className="p-4 border-t border-white/5 hidden lg:block">
                {!isDemoMode ? (
                    <button onClick={() => { if(confirm("Entrar no Modo Demonstração?")) onEnterDemo(); }} className="w-full mb-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 hover:text-white transition-all group uppercase tracking-wide">
                        <Eye size={14} className="group-hover:text-amber-400 transition-colors" /> Modo Demonstração
                    </button>
                ) : (
                    <button onClick={onExitDemo} className="w-full mb-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-bold text-red-400 hover:text-white transition-all group uppercase tracking-wide">
                        <LogOut size={14} /> Sair do Demo
                    </button>
                )}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Licença Ativa</p>
                    <p className="text-xs text-white font-mono truncate" title={currentUserKey}>{currentUserKey === 'TROPA-FREE' ? 'GRATUITA' : currentUserKey}</p>
                </div>
            </div>
            {/* Mobile Close Button Overlay */}
            {mobileMenuOpen && (
                <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="absolute top-4 right-4 md:hidden text-gray-400 hover:text-white bg-black/20 p-2 rounded-full backdrop-blur-sm"
                >
                    <X size={20} />
                </button>
            )}
        </nav>
    </>
  );
};

// Helper simples para o ícone que não foi importado diretamente acima para evitar conflito de nomes
const ActivityIcon = ({size}: {size:number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);

export default Sidebar;