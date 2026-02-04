import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, RefreshCw, Search, Copy, Check, X, Clock, AlertTriangle, MessageSquare, Trash2, Shield, LogIn, DollarSign, Server } from 'lucide-react';

interface Props {
    notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Service {
    id: number;
    name: string;
    price: number;
    quantity: number;
}

interface ActiveNumber {
    id: string;
    number: string;
    service_name: string;
    service_id: number;
    code?: string;
    status: 'WAITING' | 'RECEIVED' | 'CANCELED' | 'FINISHED';
    timer?: number; // Para controle de cancelamento
    server_id: number;
    purchase_time: number;
}

// Configuração do Proxy Reverso (Vercel)
const API_BASE = '/api/sms-rush';

const SmsRush: React.FC<Props> = ({ notify }) => {
    // Auth State
    const [token, setToken] = useState(localStorage.getItem('sms_rush_token') || '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [balance, setBalance] = useState<number | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // App State
    const [services, setServices] = useState<Service[]>([]);
    const [filteredServices, setFilteredServices] = useState<Service[]>([]);
    const [selectedServer, setSelectedServer] = useState<1 | 2>(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeNumbers, setActiveNumbers] = useState<ActiveNumber[]>([]);
    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [isBuying, setIsBuying] = useState(false);

    // Refs para Polling
    const pollingRef = useRef<any>(null);

    // --- AUTENTICAÇÃO ---
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (data.token) {
                setToken(data.token);
                localStorage.setItem('sms_rush_token', data.token);
                if (data.user && data.user.balance) setBalance(Number(data.user.balance));
                notify('Conectado ao SMS Rush!', 'success');
            } else {
                throw new Error(data.message || 'Falha no login');
            }
        } catch (err: any) {
            notify(err.message, 'error');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = () => {
        setToken('');
        localStorage.removeItem('sms_rush_token');
        setServices([]);
        setActiveNumbers([]);
    };

    // --- SERVIÇOS ---
    useEffect(() => {
        if (token) {
            fetchServices();
            // Start Polling loop if we have active numbers
            startPolling();
        }
        return () => stopPolling();
    }, [token, selectedServer]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredServices(services);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredServices(services.filter(s => s.name.toLowerCase().includes(lower)));
        }
    }, [searchTerm, services]);

    const fetchServices = async () => {
        setIsLoadingServices(true);
        try {
            // Busca dinâmica baseada no Server ID (1 ou 2) e País (73 = Brasil)
            const res = await fetch(`${API_BASE}/services?country_id=73&server_id=${selectedServer}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (Array.isArray(data)) {
                // Mapeia para formato padrão
                const mapped = data.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    price: Number(s.price),
                    quantity: s.quantity
                })).sort((a,b) => a.name.localeCompare(b.name));
                setServices(mapped);
                setFilteredServices(mapped);
            }
        } catch (err) {
            console.error(err);
            notify('Erro ao carregar serviços.', 'error');
        } finally {
            setIsLoadingServices(false);
        }
    };

    // --- COMPRA & FLUXO ---
    const handleBuyNumber = async (service: Service) => {
        if (isBuying) return;
        setIsBuying(true);
        try {
            const res = await fetch(`${API_BASE}/virtual-numbers`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    service_id: service.id,
                    country_id: 73,
                    server_id: selectedServer
                })
            });
            const data = await res.json();

            if (data.id && data.number) {
                // Sucesso na compra
                const newNumber: ActiveNumber = {
                    id: data.id,
                    number: data.number,
                    service_name: service.name,
                    service_id: service.id,
                    status: 'WAITING',
                    server_id: selectedServer,
                    purchase_time: Date.now()
                };
                
                setActiveNumbers(prev => [newNumber, ...prev]);
                
                // UX: Copiar Automático
                navigator.clipboard.writeText(data.number);
                notify(`Número ${data.number} copiado!`, 'success');
                
                // Refresh balance se possível (API não retorna saldo na compra, mas podemos tentar estimar ou refazer login/profile)
                if(balance !== null) setBalance(prev => prev ? prev - service.price : 0);

            } else {
                throw new Error(data.message || 'Sem estoque ou erro.');
            }
        } catch (err: any) {
            notify(`Erro na compra: ${err.message}`, 'error');
        } finally {
            setIsBuying(false);
        }
    };

    // --- POLLING DE STATUS ---
    const startPolling = () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        
        pollingRef.current = setInterval(async () => {
            setActiveNumbers(currentList => {
                // Filtra apenas os que estão esperando
                const waiting = currentList.filter(n => n.status === 'WAITING');
                if (waiting.length === 0) return currentList;

                // Para cada número esperando, checa status
                waiting.forEach(async (num) => {
                    try {
                        const res = await fetch(`${API_BASE}/virtual-numbers/${num.id}/status`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await res.json();
                        
                        // A API retorna { status: 'RECEIVED', message: '123456' } ou similar
                        if (data.status === 'RECEIVED' || data.sms_code) {
                            const code = data.sms_code || data.message; // Adaptar conforme retorno real
                            updateNumberStatus(num.id, 'RECEIVED', code);
                            notify(`SMS Recebido para ${num.service_name}!`, 'success');
                            
                            // Toca som
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
                            audio.play().catch(()=>{});
                        } else if (data.status === 'CANCELED' || data.status === 'TIMEOUT') {
                            updateNumberStatus(num.id, 'CANCELED');
                        }
                    } catch (e) {
                        // Ignora erro de rede no polling para não spammar
                    }
                });

                return currentList;
            });
        }, 5000); // 5 segundos conforme especificação
    };

    const stopPolling = () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
    };

    const updateNumberStatus = (id: string, status: ActiveNumber['status'], code?: string) => {
        setActiveNumbers(prev => prev.map(n => n.id === id ? { ...n, status, code } : n));
    };

    // --- CANCELAMENTO & FINALIZAÇÃO ---
    const handleCancel = async (num: ActiveNumber) => {
        if (!confirm('Cancelar este número e pedir reembolso?')) return;

        try {
            const res = await fetch(`${API_BASE}/virtual-numbers/${num.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Tratamento do Status Code
            // 200/204 = Sucesso
            // 400 = Erro de tempo (Semáforo Amarelo)
            
            if (res.ok) {
                updateNumberStatus(num.id, 'CANCELED');
                notify('Número cancelado e reembolsado.', 'info');
                // Estimativa de estorno no saldo visual
                // if (balance !== null) fetchProfile... (ideal seria buscar perfil novamente)
            } else {
                const data = await res.json();
                // Regra do Semáforo Amarelo
                if (data.message && data.message.includes('time') || res.status === 400) {
                    const timeLeft = 120; // 2 minutos padrão se a API não mandar o tempo
                    updateNumberTimer(num.id, timeLeft);
                    notify('Cancelamento pendente. Aguarde o contador.', 'error');
                } else {
                    notify(`Erro: ${data.message}`, 'error');
                }
            }
        } catch (err) {
            notify('Erro de conexão ao cancelar.', 'error');
        }
    };

    const updateNumberTimer = (id: string, time: number) => {
        setActiveNumbers(prev => prev.map(n => n.id === id ? { ...n, timer: time } : n));
        
        // Inicia contagem regressiva local para este item
        const interval = setInterval(() => {
            setActiveNumbers(current => {
                const target = current.find(n => n.id === id);
                if (!target || target.status !== 'WAITING' || (target.timer && target.timer <= 0)) {
                    clearInterval(interval);
                    return current;
                }
                return current.map(n => n.id === id ? { ...n, timer: (n.timer || 0) - 1 } : n);
            });
        }, 1000);
    };

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-[600px] animate-fade-in">
                <div className="w-full max-w-md p-8 bg-[#0a0516] border border-emerald-500/20 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><Smartphone size={100} /></div>
                    
                    <div className="text-center mb-8 relative z-10">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                            <Smartphone size={32} className="text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white">SMS Rush</h2>
                        <p className="text-gray-400 text-sm mt-2">Automação de Ativações 2.0</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email</label>
                            <input 
                                type="email" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Senha</label>
                            <input 
                                type="password" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isLoggingIn}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all"
                        >
                            {isLoggingIn ? <RefreshCw className="animate-spin" size={18} /> : <LogIn size={18} />}
                            ACESSAR PAINEL
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-lg">
                        <Smartphone size={24} className="text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white">SMS Studio I.A</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-400 font-mono bg-white/5 px-2 py-0.5 rounded flex items-center gap-1">
                                <Shield size={10} /> Conexão Segura
                            </span>
                            {balance !== null && (
                                <span className="text-sm text-emerald-400 font-bold flex items-center gap-1">
                                    <DollarSign size={14} /> Saldo: R$ {balance.toFixed(2)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 underline">Sair</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* COLUNA 1: SERVIÇOS */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Server Selector */}
                    <div className="bg-[#0a0516] p-4 rounded-2xl border border-white/10 flex gap-2">
                        <button 
                            onClick={() => setSelectedServer(1)}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all flex flex-col items-center gap-1 ${
                                selectedServer === 1 ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:text-white'
                            }`}
                        >
                            <Server size={16} /> Servidor 1 (Rápido)
                        </button>
                        <button 
                            onClick={() => setSelectedServer(2)}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all flex flex-col items-center gap-1 ${
                                selectedServer === 2 ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:text-white'
                            }`}
                        >
                            <Server size={16} /> Servidor 2 (Econ.)
                        </button>
                    </div>

                    {/* Search & List */}
                    <div className="bg-[#0a0516] rounded-2xl border border-white/10 overflow-hidden flex flex-col h-[600px]">
                        <div className="p-4 border-b border-white/5">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar serviço (ex: WhatsApp)..."
                                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {isLoadingServices ? (
                                <div className="flex justify-center py-10"><RefreshCw className="animate-spin text-emerald-500" /></div>
                            ) : (
                                filteredServices.map(service => (
                                    <div key={service.id} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all group flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{service.name}</h4>
                                            <p className="text-[10px] text-gray-500">Qtd: {service.quantity} • ID: {service.id}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleBuyNumber(service)}
                                            disabled={isBuying}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-1"
                                        >
                                            R$ {service.price.toFixed(2)}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUNA 2: MEUS NÚMEROS */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-[#0a0516] p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <MessageSquare size={18} className="text-emerald-400" /> Ativações Recentes
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            Polling Ativo (5s)
                        </div>
                    </div>

                    <div className="space-y-3">
                        {activeNumbers.length === 0 ? (
                            <div className="text-center py-20 opacity-50">
                                <Smartphone size={48} className="mx-auto mb-4 text-gray-600" />
                                <p className="text-gray-500">Nenhum número ativo no momento.</p>
                            </div>
                        ) : (
                            activeNumbers.map(num => (
                                <div key={num.id} className={`p-5 rounded-2xl border relative overflow-hidden transition-all ${
                                    num.status === 'RECEIVED' ? 'bg-emerald-900/10 border-emerald-500/30' : 
                                    num.status === 'CANCELED' ? 'bg-red-900/10 border-red-500/20 opacity-60' :
                                    'bg-white/5 border-white/10'
                                }`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/10 rounded-lg">
                                                {num.status === 'RECEIVED' ? <Check className="text-emerald-400" /> : <Clock className="text-amber-400 animate-pulse" />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg tracking-wide">{num.number}</h4>
                                                <p className="text-xs text-gray-400 flex items-center gap-2">
                                                    {num.service_name} • Server {num.server_id}
                                                    {num.status === 'WAITING' && <span className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">Aguardando SMS...</span>}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="text-right">
                                            <button 
                                                onClick={() => { navigator.clipboard.writeText(num.number); notify('Copiado!', 'success'); }}
                                                className="text-xs bg-black/40 hover:bg-white/10 text-gray-400 px-3 py-1.5 rounded-lg border border-white/10 transition-colors flex items-center gap-1 ml-auto"
                                            >
                                                <Copy size={12} /> Copiar
                                            </button>
                                        </div>
                                    </div>

                                    {/* ÁREA DO CÓDIGO SMS */}
                                    <div className="bg-black/40 rounded-xl p-4 border border-white/5 text-center min-h-[60px] flex items-center justify-center">
                                        {num.status === 'RECEIVED' ? (
                                            <span className="text-3xl font-black text-emerald-400 tracking-[0.2em] drop-shadow-glow animate-bounce-in">
                                                {num.code}
                                            </span>
                                        ) : num.status === 'CANCELED' ? (
                                            <span className="text-red-400 text-sm font-bold uppercase">Cancelado</span>
                                        ) : (
                                            <div className="flex items-center gap-2 text-gray-600 text-xs animate-pulse">
                                                <MessageSquare size={14} /> Esperando mensagem...
                                            </div>
                                        )}
                                    </div>

                                    {/* AÇÕES DE CONTROLE */}
                                    {num.status === 'WAITING' && (
                                        <div className="mt-4 flex justify-end">
                                            {num.timer && num.timer > 0 ? (
                                                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                                                    <AlertTriangle size={14} />
                                                    Aguarde {num.timer}s para cancelar
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleCancel(num)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-all"
                                                >
                                                    <X size={14} /> Cancelar / Reembolsar
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmsRush;