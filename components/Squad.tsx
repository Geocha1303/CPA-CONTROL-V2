import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { SquadMember, AppState } from '../types';
import { Users, Eye, Activity, RefreshCw, AlertTriangle, Search, ShieldCheck, Link, Copy, UserCheck, Shield, Lock, ChevronRight, UserPlus, Info, Hash, Crown, Database, MessageSquare, Bell, Send, CheckCircle2, TrendingUp, Trophy, Target, DollarSign, Trash2, Clock, Construction, Hammer } from 'lucide-react';
import { formatarBRL, getHojeISO, calculateDayMetrics } from '../utils';

interface Props {
  currentUserKey: string;
  onSpectate: (data: AppState, memberName: string) => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface FeedMessage {
    id: number;
    from: string;
    message: string;
    type: 'info' | 'success' | 'alert';
    timestamp: number;
}

interface MemberMetrics {
    profit: number;
    volume: number;
}

const Squad: React.FC<Props> = ({ currentUserKey, onSpectate, notify }) => {
  // --- MANTENDO ESTADOS PARA QUANDO VOLTAR ---
  const [members, setMembers] = useState<(SquadMember & { metrics?: MemberMetrics })[]>([]);
  
  // --- MODO MANUTENÇÃO ATIVO ---
  // Retorna diretamente a tela de bloqueio, impedindo qualquer ação.
  return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-fade-in p-6 text-center">
          <div className="gateway-card p-12 rounded-3xl border border-amber-500/20 bg-amber-500/5 shadow-[0_0_60px_rgba(245,158,11,0.1)] max-w-xl w-full relative overflow-hidden backdrop-blur-xl">
              
              {/* Background Effects */}
              <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_rgba(245,158,11,0.05),_transparent_70%)] animate-pulse-slow pointer-events-none"></div>
              <div className="absolute top-0 right-0 p-10 opacity-5">
                  <Construction size={200} />
              </div>

              <div className="relative z-10 flex flex-col items-center">
                  <div className="p-6 bg-amber-500/10 rounded-full border border-amber-500/30 mb-8 shadow-lg shadow-amber-900/20">
                      <Hammer size={48} className="text-amber-400 animate-pulse" />
                  </div>
                  
                  <h2 className="text-3xl font-black text-white mb-4 tracking-tight">EM MANUTENÇÃO</h2>
                  
                  <div className="h-1 w-20 bg-amber-500 rounded-full mb-6"></div>

                  <p className="text-gray-300 text-lg leading-relaxed font-medium mb-8 max-w-sm">
                      Estamos atualizando o sistema de Squad para melhor performance.
                      <br/><br/>
                      <span className="text-amber-200 font-bold bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 text-sm">
                          Será enviado uma mensagem quando estiver disponível.
                      </span>
                  </p>

                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest bg-black/40 px-4 py-2 rounded-full border border-white/5">
                      <Lock size={12} /> Acesso Temporariamente Bloqueado
                  </div>
              </div>
          </div>
      </div>
  );
};

export default Squad;