import React, { useState } from 'react';
import { Fingerprint, ArrowRight } from 'lucide-react';

interface Props {
    onSave: (name: string) => void;
    currentName?: string;
}

const IdentityModal: React.FC<Props> = ({ onSave, currentName }) => {
    const [name, setName] = useState('');
    
    // Lista de nomes inválidos que forçam a troca
    const invalidNames = ['OPERADOR', 'VISITANTE', 'VISITANTE GRATUITO', 'TESTE', 'ADMIN', 'USUARIO'];

    // Validação: Nome deve ter tamanho > 2 e não pode estar na lista de inválidos
    const isValid = name.trim().length > 2 && !invalidNames.includes(name.trim().toUpperCase());

    return (
        <div className="fixed inset-0 z-[10000] bg-[#02000f]/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#0a0a0a] border border-primary/50 rounded-2xl w-full max-w-md p-8 shadow-[0_0_50px_rgba(112,0,255,0.3)] relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                
                <div className="mb-6 flex justify-center">
                    <div className="p-4 bg-primary/10 rounded-full border border-primary/20 shadow-[0_0_20px_rgba(112,0,255,0.15)] animate-pulse-slow">
                        <Fingerprint size={40} className="text-primary" />
                    </div>
                </div>

                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Identificação Necessária</h2>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                    {currentName && currentName.toUpperCase().includes('VISITANTE') 
                        ? "O modo Visitante é temporário. Para salvar seu progresso e acessar o Squad, escolha um nome de operador único."
                        : "Detectamos que você está usando um nome padrão do sistema. Por favor, identifique-se para continuar."}
                </p>

                <div className="space-y-4">
                    <div className="relative group text-left">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 mb-1 block">Novo Nome de Operador</label>
                        <input 
                            type="text" 
                            autoFocus
                            placeholder="Ex: Fox, Imperador, Ana..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-lg text-white font-bold focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-700 text-center uppercase"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && isValid && onSave(name)}
                        />
                    </div>

                    <button 
                        onClick={() => onSave(name)}
                        disabled={!isValid}
                        className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg
                            ${!isValid 
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                                : 'bg-primary hover:bg-primary-glow text-white shadow-primary/20 transform hover:-translate-y-1 active:scale-95'}
                        `}
                    >
                        Confirmar Identidade <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IdentityModal;