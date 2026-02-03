import React, { useState, useRef, MouseEvent, useMemo } from 'react';
import { ShoppingBag, ExternalLink, Search, Zap, Filter, Tag, Shield, Layers, ArrowRight, Sparkles, CheckCircle2, LayoutGrid, Box } from 'lucide-react';
import { formatarBRL } from '../utils';

interface Product {
    id: number;
    name: string;
    price: number;
    oldPrice?: number;
    image: string;
    link: string;
    tag?: string;
    deliveryType: 'Automatic' | 'Manual';
}

interface Section {
    id: string; // Adicionado ID para controle de abas
    title: string;
    shortTitle: string; // Título curto para o botão da aba
    description?: string;
    icon?: React.ElementType;
    products: Product[];
}

const STORE_DATA: Section[] = [
    {
        id: 'metodos',
        title: "Métodos Exclusivos",
        shortTitle: "Métodos",
        icon: Sparkles,
        description: "Estratégias validadas para alavancar seus resultados.",
        products: [
            {
                id: 1,
                name: 'EXTRAÇÃO DE BAU - GRUPO BET',
                price: 90.00,
                oldPrice: 130.00,
                image: 'https://cdn.ereemby.com/attachments/17691282482027111imagem.jpeg',
                link: 'https://cpaofc.com.br/product/metodo',
                tag: '-30% OFF',
                deliveryType: 'Automatic'
            },
            {
                id: 2,
                name: 'GRUPO VIP JOTTEX',
                price: 150.00,
                oldPrice: 200.00,
                image: 'https://cdn.ereemby.com/attachments/17678011642618847imagem.jpeg',
                link: 'https://cpaofc.com.br/product/176962922053427294030716452',
                tag: 'VIP',
                deliveryType: 'Automatic'
            }
        ]
    },
    {
        id: 'robos',
        title: "Automação & Robôs",
        shortTitle: "Robôs & Bots",
        icon: Zap,
        description: "Ferramentas para escalar sua operação no CPA Chinês.",
        products: [
            {
                id: 3,
                name: 'CASH HUNTER - VITALICIO',
                price: 450.00,
                image: 'https://cdn.ereemby.com/attachments/17677926170581333imagem.jpeg',
                link: 'https://cpaofc.com.br/product/robo',
                tag: 'LIFETIME',
                deliveryType: 'Automatic'
            },
            {
                id: 4,
                name: 'CASH HUNTER DIARIO!',
                price: 70.00,
                image: 'https://cdn.ereemby.com/attachments/17677926170581333imagem.jpeg',
                link: 'https://cpaofc.com.br/product/botdiario',
                deliveryType: 'Automatic'
            }
        ]
    },
    {
        id: 'educacao',
        title: "Educação Profissional",
        shortTitle: "Cursos",
        icon: Layers,
        description: "Treinamentos do básico ao avançado.",
        products: [
            {
                id: 5,
                name: 'CURSO CPA (INICIANTE AO AVANCADO)',
                price: 250.00,
                image: 'https://cdn.ereemby.com/attachments/17678011628333920imagem.jpeg',
                link: 'https://cpaofc.com.br/product/cpa',
                tag: 'COMPLETO',
                deliveryType: 'Automatic'
            }
        ]
    },
    {
        id: 'web',
        title: "Ferramentas Web",
        shortTitle: "Sites & Web",
        icon: Box,
        description: "Utilitários para construção de ativos digitais.",
        products: [
            {
                id: 6,
                name: 'GERADOR DE SITES DE PORCENTAGENS',
                price: 8.00,
                oldPrice: 20.00,
                image: 'https://cdn.ereemby.com/attachments/17698843460456502imagem.jpeg',
                link: 'https://cpaofc.com.br/product/1769884696939648540991056777785',
                tag: '-60%',
                deliveryType: 'Automatic'
            }
        ]
    },
    {
        id: 'instagram',
        title: "Perfis Instagram",
        shortTitle: "Contas Insta",
        icon: CheckCircle2,
        description: "Contas aquecidas prontas para uso.",
        products: [
            {
                id: 7,
                name: 'PERFIL DE 3K DE SEGUIDORES',
                price: 98.00,
                oldPrice: 125.00,
                image: 'https://cdn.ereemby.com/attachments/17692175292945909imagem.png',
                link: 'https://cpaofc.com.br/product/176921930852954460958704596',
                tag: 'POPULAR',
                deliveryType: 'Automatic'
            },
            {
                id: 8,
                name: 'PERFIL DE 5K DE SEGUIDORES',
                price: 148.00,
                oldPrice: 160.00,
                image: 'https://cdn.ereemby.com/attachments/17692175292945909imagem.png',
                link: 'https://cpaofc.com.br/product/17692193666986750206348981064477350',
                deliveryType: 'Automatic'
            },
            {
                id: 9,
                name: 'PERFIL DE 10K DE SEGUIDORES',
                price: 273.00,
                oldPrice: 300.00,
                image: 'https://cdn.ereemby.com/attachments/17692175292945909imagem.png',
                link: 'https://cpaofc.com.br/product/17692195970266920249297797841',
                tag: 'VIP',
                deliveryType: 'Automatic'
            },
            {
                id: 10,
                name: 'PERFIL DE 1K DE SEGUIDORES',
                price: 38.00,
                oldPrice: 45.00,
                image: 'https://cdn.ereemby.com/attachments/17692175292945909imagem.png',
                link: 'https://cpaofc.com.br/product/1769219205212404989279875204',
                deliveryType: 'Automatic'
            }
        ]
    },
    {
        id: 'proxy',
        title: "Proxy Residencial & Rotativa",
        shortTitle: "Proxies",
        icon: Shield,
        description: "Conexões seguras e anônimas de alta velocidade.",
        products: [
            {
                id: 11,
                name: '1GB - PROXY ROTATIVA',
                price: 7.50,
                image: 'https://cdn.ereemby.com/attachments/17680655007915372imagem.jpeg',
                link: 'https://cpaofc.com.br/product/proxyrt',
                deliveryType: 'Automatic'
            },
            {
                id: 13,
                name: '2GB - PROXY ROTATIVA',
                price: 14.60,
                image: 'https://cdn.ereemby.com/attachments/17680655007915372imagem.jpeg',
                link: 'https://cpaofc.com.br/product/176801629396063944186128713371',
                deliveryType: 'Automatic'
            },
            {
                id: 12,
                name: '3GB - PROXY ROTATIVA',
                price: 20.50,
                image: 'https://cdn.ereemby.com/attachments/17680655007915372imagem.jpeg',
                link: 'https://cpaofc.com.br/product/176801607519166958499088726574524',
                tag: 'MAIS VENDIDO',
                deliveryType: 'Automatic'
            },
            {
                id: 14,
                name: '5GB - PROXY ROTATIVA',
                price: 36.00,
                image: 'https://cdn.ereemby.com/attachments/17680655007915372imagem.jpeg',
                link: 'https://cpaofc.com.br/product/rotativa',
                deliveryType: 'Automatic'
            },
            {
                id: 19,
                name: '10GB - PROXY ROTATIVA',
                price: 70.00,
                image: 'https://cdn.ereemby.com/attachments/17680655007915372imagem.jpeg',
                link: 'https://cpaofc.com.br/product/17691281521898446932601949',
                tag: 'PRO',
                deliveryType: 'Automatic'
            },
            {
                id: 15,
                name: 'PROXY FIXA - 5GB CADA',
                price: 8.00,
                image: 'https://cdn.ereemby.com/attachments/1767807352490858imagem.jpeg',
                link: 'https://cpaofc.com.br/product/176780737330632950402273453860',
                deliveryType: 'Automatic'
            }
        ]
    },
    {
        id: 'streaming',
        title: "Streaming & Entretenimento",
        shortTitle: "Streaming",
        icon: ShoppingBag,
        description: "Acesso premium às melhores plataformas.",
        products: [
            {
                id: 16,
                name: 'TNT SPORT 4K + PARAMOUNT UEFA',
                price: 8.00,
                image: 'https://cdn.ereemby.com/attachments/17698712050406098imagem.jpeg',
                link: 'https://cpaofc.com.br/product/17698712134342084273463113163494053',
                deliveryType: 'Automatic'
            },
            {
                id: 17,
                name: 'PRIME VÍDEO (30 DIAS) + PARAMOUNT',
                price: 7.50,
                image: 'https://cdn.ereemby.com/attachments/17698715664893832imagem.jpeg',
                link: 'https://cpaofc.com.br/product/1769871440776283746159215470',
                deliveryType: 'Automatic'
            },
            {
                id: 18,
                name: 'CRUNCHYROLL + CANVA PRO',
                price: 6.00,
                image: 'https://cdn.ereemby.com/attachments/17698718466695393imagem.jpeg',
                link: 'https://cpaofc.com.br/product/17698718813856674274197769',
                deliveryType: 'Automatic'
            },
            {
                id: 20,
                name: '[15 DIAS] NETFLIX + CANVA',
                price: 17.00,
                image: 'https://cdn.ereemby.com/attachments/17698722532084262imagem.jpeg',
                link: 'https://cpaofc.com.br/product/17698722853749550040048865619',
                deliveryType: 'Automatic'
            }
        ]
    }
];

// --- COMPONENTE DE CARTÃO TILT 3D (COMPACTO) ---
const TiltCard: React.FC<{ product: Product }> = ({ product }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const rotateY = ((mouseX - width / 2) / width) * 15; // Reduzido para 15deg
        const rotateX = ((mouseY - height / 2) / height) * -15;

        setRotation({ x: rotateX, y: rotateY });
        setGlare({ 
            x: (mouseX / width) * 100, 
            y: (mouseY / height) * 100, 
            opacity: 1 
        });
    };

    const handleMouseLeave = () => {
        setRotation({ x: 0, y: 0 });
        setGlare(prev => ({ ...prev, opacity: 0 }));
    };

    return (
        <div 
            ref={cardRef}
            className="relative h-full transition-all duration-300 ease-out"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
        >
            <div 
                className="h-full bg-[#0c0818] rounded-2xl border border-white/5 overflow-hidden shadow-xl group relative flex flex-col"
                style={{
                    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1.0, 1.0, 1.0)`,
                    transition: 'transform 0.1s ease-out',
                    transformStyle: 'preserve-3d'
                }}
            >
                {/* GLARE EFFECT */}
                <div 
                    className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay transition-opacity duration-300"
                    style={{
                        background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 80%)`,
                        opacity: glare.opacity
                    }}
                ></div>

                {/* IMAGEM (Compactada) */}
                <div className="aspect-[16/10] relative overflow-hidden bg-gray-900" style={{ transform: 'translateZ(0px)' }}>
                    <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0818] via-transparent to-transparent opacity-80"></div>
                    
                    {product.tag && (
                        <div className="absolute top-2 left-2" style={{ transform: 'translateZ(20px)' }}>
                            <span className="bg-emerald-500 text-black text-[9px] font-black px-2 py-1 rounded shadow-lg flex items-center gap-1 uppercase tracking-wider">
                                <Sparkles size={8} fill="black" /> {product.tag}
                            </span>
                        </div>
                    )}

                    {product.deliveryType === 'Automatic' && (
                        <div className="absolute top-2 right-2" style={{ transform: 'translateZ(15px)' }}>
                            <div className="bg-black/60 backdrop-blur-md text-emerald-400 text-[9px] font-bold px-2 py-1 rounded border border-emerald-500/30 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                Auto
                            </div>
                        </div>
                    )}
                </div>

                {/* CONTEÚDO (Compactado) */}
                <div className="p-4 flex flex-col flex-1 relative z-20" style={{ transform: 'translateZ(30px)' }}>
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight mb-2 line-clamp-2 min-h-[2.5em] group-hover:text-emerald-300 transition-colors drop-shadow-md">
                            {product.name}
                        </h3>
                        
                        <div className="flex items-end gap-2 mb-4">
                            <div className="text-2xl font-black text-white font-mono tracking-tighter drop-shadow-lg">
                                {formatarBRL(product.price)}
                            </div>
                            {product.oldPrice && (
                                <div className="text-[10px] text-gray-600 line-through font-bold mb-1.5">
                                    {formatarBRL(product.oldPrice)}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <a 
                            href={product.link}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full bg-white/5 hover:bg-emerald-600 hover:text-black text-white font-bold py-2.5 rounded-lg transition-all border border-white/10 flex items-center justify-center gap-2 group/btn relative overflow-hidden shadow-lg text-xs"
                            style={{ transform: 'translateZ(10px)' }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <ShoppingBag size={14} /> COMPRAR
                            </span>
                            <ArrowRight size={12} className="relative z-10 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Store: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<string>('todos'); // 'todos' ou o ID da section

    // Filtra sections baseado na busca e na aba ativa
    const filteredSections = useMemo(() => {
        return STORE_DATA.map(section => {
            // Se não for a aba ativa e não for 'todos', ignora (retorna vazio para filtrar depois)
            if (activeTab !== 'todos' && section.id !== activeTab) {
                return { ...section, products: [] };
            }

            // Filtra produtos pela busca
            const filteredProducts = section.products.filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

            return { ...section, products: filteredProducts };
        }).filter(section => section.products.length > 0);
    }, [searchTerm, activeTab]);

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in pb-20 px-4 md:px-8 relative overflow-hidden">
            
            {/* Ambient Background Lights */}
            <div className="fixed top-20 left-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[150px] pointer-events-none z-0"></div>

            {/* --- HERO BANNER (Compactado Verticalmente) --- */}
            <div className="relative rounded-[1.5rem] overflow-hidden mb-8 h-[240px] md:h-[280px] border border-white/5 shadow-2xl group transition-all duration-700 hover:shadow-emerald-900/20 z-10">
                <div className="absolute inset-0 bg-[#050505]">
                    <img 
                        src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2000&auto=format&fit=crop" 
                        alt="Store Banner" 
                        className="w-full h-full object-cover opacity-30 mix-blend-overlay group-hover:scale-105 transition-transform duration-[1.5s]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#02000f] via-[#02000f]/80 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/10 via-transparent to-transparent"></div>
                </div>
                
                <div className="absolute bottom-0 left-0 p-8 md:p-12 z-20 max-w-4xl">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="bg-emerald-500 text-black border border-emerald-400 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                            <Shield size={10} fill="currentColor" /> Verified Partner
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4 drop-shadow-xl leading-[0.9]">
                        CPA STORE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">ELITE</span>
                    </h1>
                    <p className="text-gray-300 text-sm md:text-base max-w-xl font-medium leading-relaxed drop-shadow-md border-l-4 border-emerald-500 pl-4">
                        Arsenal completo para sua operação. Ferramentas, contas e métodos de alto calibre.
                    </p>
                </div>

                <div className="absolute top-8 right-8 z-20 hidden lg:block">
                    <a 
                        href="https://cpaofc.com.br/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="group bg-white/5 hover:bg-white/10 text-white backdrop-blur-xl px-6 py-3 rounded-xl font-bold flex items-center gap-2 border border-white/10 transition-all hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] text-xs"
                    >
                        <span className="uppercase tracking-widest">Site Oficial</span>
                        <div className="bg-emerald-500 text-black p-1 rounded group-hover:rotate-45 transition-transform duration-300">
                            <ExternalLink size={12} />
                        </div>
                    </a>
                </div>
            </div>

            {/* --- SEARCH & CATEGORY TABS --- */}
            <div className="sticky top-2 z-50 space-y-4 mb-8">
                {/* Search Bar */}
                <div className="relative max-w-3xl mx-auto group">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 transition-opacity duration-500 group-focus-within:opacity-30"></div>
                    <div className="relative shadow-2xl">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="text-gray-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Buscar métodos, proxies ou contas..."
                            className="w-full bg-[#0a0614]/90 backdrop-blur-xl border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white font-medium focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all shadow-black/50 text-sm placeholder:text-gray-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Category Tabs (Scrollable) */}
                <div className="flex justify-center">
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 max-w-full px-4 snap-x">
                        <button
                            onClick={() => setActiveTab('todos')}
                            className={`flex-shrink-0 snap-start px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border ${
                                activeTab === 'todos'
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/30'
                                : 'bg-black/40 text-gray-400 border-white/5 hover:bg-white/5 hover:text-white backdrop-blur-sm'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <LayoutGrid size={14} /> Todos
                            </div>
                        </button>
                        
                        {STORE_DATA.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveTab(section.id)}
                                className={`flex-shrink-0 snap-start px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border ${
                                    activeTab === section.id
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/30'
                                    : 'bg-black/40 text-gray-400 border-white/5 hover:bg-white/5 hover:text-white backdrop-blur-sm'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    {section.icon && <section.icon size={14} />}
                                    {section.shortTitle}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- SECTIONS --- */}
            <div className="space-y-12 relative z-10 min-h-[400px]">
                {filteredSections.map((section) => (
                    <div key={section.id} className="animate-fade-in">
                        {/* Section Header (Only show if filtering all) */}
                        {activeTab === 'todos' && (
                            <div className="flex flex-col md:flex-row md:items-end gap-3 mb-6 border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-900/50 to-black border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-900/20">
                                        {section.icon ? <section.icon size={20} className="text-emerald-400" /> : <Layers size={20} className="text-emerald-400" />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">{section.title}</h2>
                                        {section.description && <p className="text-gray-500 text-xs mt-0.5 font-medium">{section.description}</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Products Grid (High Density) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                            {section.products.map(product => (
                                <div key={product.id} className="h-full">
                                    <TiltCard product={product} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredSections.length === 0 && (
                    <div className="py-20 text-center opacity-50">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Filter size={40} className="text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Nenhum resultado</h3>
                        <p className="text-gray-500 text-sm font-medium">Tente ajustar seus filtros ou busca.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Store;