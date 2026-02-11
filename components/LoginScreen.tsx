import React, { useState, useEffect } from 'react';
import { Activity, Lock, AlertCircle, ChevronDown, RefreshCw, CheckCircle2, Unlock, Eye, Crown } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AUTH_STORAGE_KEY, DEVICE_ID_KEY, FREE_KEY_STORAGE } from '../utils';

interface Props {
    onLogin: (key: string, isAdmin: boolean, ownerName: string) => void;
    onDemo: () => void;
    autoLoginCheck: boolean;
}

const LoginScreen: React.FC<Props> = ({ onLogin, onDemo, autoLoginCheck }) => {
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [deviceId, setDeviceId] = useState('');
    const [loginMode, setLoginMode] = useState<'free' | 'vip'>('free'); // 'free' is default view

    useEffect(() => {
        let storedId = localStorage.getItem(DEVICE_ID_KEY);
        if (!storedId) {
            storedId = 'HWID-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now().toString(16).toUpperCase();
            localStorage.setItem(DEVICE_ID_KEY, storedId);
        }
        setDeviceId(storedId);
    }, []);

    // Se estiver verificando sessão automática, mostra apenas um loader minimalista
    if (autoLoginCheck) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#02000f] text-white">
                <RefreshCw size={40} className="text-primary animate-spin mb-4" />
                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest animate-pulse">Restaurando Sessão Segura...</p>
            </div>
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        const rawKey = inputKey.trim().toUpperCase();
        
        try {
            const { data, error } = await supabase
                .from('access_keys')
                .select('*')
                .eq('key', rawKey)
                .single();

            if (error || !data) {
                await new Promise(resolve => setTimeout(resolve, 1000)); 
                throw new Error('Chave de acesso inválida ou inexistente.');
            }

            if (data.active === false) {
                 throw new Error('Acesso suspenso administrativamente.');
            }

            // Se NÃO for admin (verificado no banco), aplica trava de HWID
            if (!data.is_admin) {
                if (data.hwid && data.hwid !== deviceId) {
                    throw new Error('Chave vinculada a outro dispositivo. Solicite reset ao suporte.');
                }
                if (!data.hwid) {
                    const { error: updateError } = await supabase
                        .from('access_keys')
                        .update({ hwid: deviceId })
                        .eq('id', data.id);
                    if (updateError) throw new Error('Erro de vínculo de segurança.');
                }
            }

            setTimeout(() => {
                localStorage.setItem(AUTH_STORAGE_KEY, rawKey);
                const isAdmin = data.is_admin === true;
                onLogin(rawKey, isAdmin, data.owner_name || 'Operador');
            }, 500);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Falha de conexão.');
            setLoading(false);
        }
    };

    const handleFreeAccess = async () => {
        setLoading(true);
        try {
            // Tenta recuperar a chave FREE existente no navegador
            let existingFreeKey = localStorage.getItem(FREE_KEY_STORAGE);
            
            // Se não existir, gera uma nova
            if (!existingFreeKey || existingFreeKey === 'TROPA-FREE') {
                const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
                const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
                existingFreeKey = `FREE-${p1}-${p2}`;
                localStorage.setItem(FREE_KEY_STORAGE, existingFreeKey);
            }

            // Tenta registrar silenciosamente na nuvem (para o Admin ver)
            try {
                await supabase
                    .from('access_keys')
                    .upsert({
                        key: existingFreeKey,
                        owner_name: 'Visitante Gratuito',
                        active: true,
                        is_admin: false
                    }, { onConflict: 'key' });
            } catch (innerError) {
                console.warn("Offline fallback:", innerError);
            }

            // Define como sessão ativa
            localStorage.setItem(AUTH_STORAGE_KEY, existingFreeKey);
            
            // Login imediato
            setTimeout(() => {
                onLogin(existingFreeKey, false, 'Visitante Gratuito');
            }, 500);

        } catch (err) {
            console.error("Critical error:", err);
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#050505] font-sans selection:bg-white/20 relative overflow-hidden">
            {/* Professional Background Grid */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
                 style={{ 
                     backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', 
                     backgroundSize: '30px 30px' 
                 }}>
            </div>
            
            {/* Subtle Ambient Glow */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-[420px] p-6 animate-fade-in">
                
                {/* Header Section */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-black border border-white/10 mb-6 shadow-2xl relative group">
                        <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Activity className="text-white relative z-10" size={28} />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">CPA Gateway <span className="text-primary text-sm align-top font-mono ml-1">PRO</span></h1>
                    <p className="text-gray-500 text-xs uppercase tracking-widest font-medium">Professional Financial Management System</p>
                </div>

                {/* Main Card */}
                <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                    
                    <div className="p-8">
                        {loginMode === 'free' ? (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Acesso Gratuito Disponível</h3>
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Utilize todas as ferramentas de gestão financeira e planejamento sem custos. Seus dados são salvos localmente.
                                    </p>
                                </div>

                                <button 
                                    onClick={handleFreeAccess}
                                    disabled={loading}
                                    className="w-full group relative overflow-hidden bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <Unlock size={20} />}
                                    <span className="tracking-wide">INICIAR SESSÃO</span>
                                </button>

                                {/* BOTÃO DEMONSTRAÇÃO */}
                                <button 
                                    onClick={onDemo}
                                    type="button"
                                    className="w-full group bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/20 text-gray-300 hover:text-white font-bold py-3 rounded-xl transition-all border border-white/5 hover:border-white/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
                                >
                                    <Eye size={16} className="text-amber-400 group-hover:scale-110 transition-transform" /> MODO DEMONSTRAÇÃO
                                </button>
                                
                                <div className="pt-2 border-t border-white/5 flex justify-center">
                                    <button 
                                        onClick={() => setLoginMode('vip')}
                                        className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-2 font-medium group/vip"
                                    >
                                        <Crown size={12} className="text-amber-600 group-hover/vip:text-amber-400 transition-colors" />
                                        Possui licença VIP?
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                        <Lock size={14} className="text-amber-500"/> Área Restrita
                                    </h3>
                                    <button 
                                        type="button"
                                        onClick={() => setLoginMode('free')}
                                        className="text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-wider flex items-center gap-1"
                                    >
                                        <ChevronDown size={12} className="rotate-90"/> Voltar
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider ml-1">Chave de Licença</label>
                                    <div className="relative group/input">
                                        <input 
                                            type="text" 
                                            value={inputKey}
                                            onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-center tracking-[0.2em] text-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-gray-800 uppercase"
                                            placeholder="XXXX-XXXX-XXXX"
                                            autoFocus
                                        />
                                        <div className="absolute inset-0 rounded-xl border border-white/5 pointer-events-none group-hover/input:border-white/20 transition-colors"></div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                                        <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-400 font-medium leading-tight">{error}</p>
                                    </div>
                                )}

                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                    <span>VALIDAR ACESSO</span>
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Footer Status Bar */}
                    <div className="bg-[#050505]/50 px-6 py-3 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-gray-600">
                         <span className="flex items-center gap-1.5">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                             Secure Connection
                         </span>
                         <span className="opacity-50">ID: {deviceId.substring(0, 8)}</span>
                    </div>
                </div>
                
                <p className="text-center text-[10px] text-gray-700 mt-8 font-mono">
                    &copy; 2024 CPA Control. v3.7.2 (Stable)
                </p>
            </div>
        </div>
    );
};

export default LoginScreen;