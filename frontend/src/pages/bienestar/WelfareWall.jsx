import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    X,
    Download,
    ExternalLink,
    Calendar,
    ChevronRight,
    Search,
    Filter,
    ArrowRight,
    Star,
    Image as ImageIcon,
    FileText,
    Loader2,
    Tag,
    Trash2,
    Plus,
    Save,
    Book,
    Coffee,
    Shield,
    Briefcase,
    GraduationCap,
    Utensils,
    Plane
} from 'lucide-react';
import api from '../../api';
import { usePermission } from '../../hooks/usePermission';

// --- Icon Map ---
const ICON_OPTIONS = [
    { name: 'Heart', icon: Heart },
    { name: 'Star', icon: Star },
    { name: 'Book', icon: Book },
    { name: 'Coffee', icon: Coffee },
    { name: 'Shield', icon: Shield },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'GraduationCap', icon: GraduationCap },
    { name: 'Utensils', icon: Utensils },
    { name: 'Plane', icon: Plane },
];

const LucidIcon = ({ name, ...props }) => {
    const iconObj = ICON_OPTIONS.find(i => i.name === name);
    const IconComponent = iconObj ? iconObj.icon : Heart;
    return <IconComponent {...props} />;
};

// --- Portal Component ---
const ModalPortal = ({ children }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);
    if (!mounted) return null;
    return createPortal(children, document.body);
};

const WelfareWall = ({ limit, showFilters = true, sortBy = 'newest', layout = 'vertical' }) => {
    const [beneficios, setBeneficios] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBenefit, setSelectedBenefit] = useState(null);
    const [activePdfPreview, setActivePdfPreview] = useState(null);
    const [fullscreenImage, setFullscreenImage] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [resB, resC] = await Promise.all([
                api.get('bienestar/beneficios/'),
                api.get('bienestar/categorias/')
            ]);
            setBeneficios(resB.data.results || resB.data);
            setCategorias(resC.data.results || resC.data);
        } catch (e) {
            console.error("Error fetching welfare data", e);
        } finally {
            setLoading(false);
        }
    };

    const getFullUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${api.defaults.baseURL.replace('/api', '')}${path}`;
    };

    const filteredBeneficios = [...beneficios]
        .sort((a, b) => {
            if (sortBy === 'newest') return b.id - a.id;
            return 0;
        })
        .filter(b => b.estado === 'PUBLICADO')
        .filter(b => selectedCategory === 'ALL' || b.categoria === parseInt(selectedCategory))
        .filter(b =>
            b.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, limit || undefined);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Cargando beneficios...</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col h-full overflow-hidden">
            {showFilters && (
                <div className="px-6 py-4 border-b border-slate-50 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                <Star className="w-5 h-5 fill-indigo-600/10" />
                            </div>
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Beneficios y Convenios</h2>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                                type="text"
                                placeholder="Buscar beneficios..."
                                className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        <button onClick={() => setSelectedCategory('ALL')} className={`px-3 py-1.5 rounded-xl text-[9px] font-semibold uppercase tracking-widest transition-all ${selectedCategory === 'ALL' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Todos</button>
                        {categorias.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-3 py-1.5 rounded-xl text-[9px] font-semibold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${parseInt(selectedCategory) === cat.id ? 'shadow-lg text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                style={{ backgroundColor: parseInt(selectedCategory) === cat.id ? cat.color : '' }}
                            >
                                <LucidIcon name={cat.icono} className={`w-3 h-3 ${parseInt(selectedCategory) === cat.id ? 'text-white' : ''}`} />
                                {cat.nombre}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className={`grid gap-5 text-left px-8 py-6 flex-1 overflow-y-auto custom-scrollbar ${layout === 'horizontal'
                ? 'grid-cols-1 xl:grid-cols-2'
                : limit === 5
                    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7'
                }`}>
                <AnimatePresence>
                    {filteredBeneficios.map((b) => {
                        const imageFile = b.archivos?.find(f => f.tipo === 'image');
                        const cat = categorias.find(c => c.id === b.categoria);
                        const catColor = b.categoria_color || cat?.color || '#6366f1';
                        const catName = cat?.nombre || 'General';

                        // 1. Diseño Estilo Banco (Texto Arriba, Imagen Abajo 60%)
                        return (
                            <motion.div
                                key={b.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -5 }}
                                onClick={() => setSelectedBenefit(b)}
                                className="bg-white rounded-[1.8rem] shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group cursor-pointer h-[320px]"
                            >
                                {/* CONTENIDO DE TEXTO (ARRIBA - COMPACTO) */}
                                <div className="p-4 flex flex-col shrink-0">
                                    <div className="flex items-center gap-1.5 mb-2 px-2 py-0.5 bg-slate-50 rounded-lg w-fit">
                                        <LucidIcon name={cat?.icono} className="w-3 h-3" style={{ color: catColor }} />
                                        <span className="text-[7px] font-semibold text-slate-500 uppercase tracking-widest">{catName}</span>
                                    </div>
                                    <h4 className="text-[12px] font-bold text-slate-700 mb-0.5 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                                        {b.titulo}
                                    </h4>
                                    <p className="text-[9px] text-slate-400 font-medium line-clamp-1 truncate opacity-70">
                                        {b.descripcion}
                                    </p>
                                </div>

                                {/* IMAGEN (ABAJO - 60% DE LA TARJETA) - MÁS ESPACIO REAL */}
                                <div className="flex-1 min-h-0 relative">
                                    {imageFile ? (
                                        <div className="w-full h-full overflow-hidden border-t border-slate-50 rounded-b-[1.8rem]">
                                            <img
                                                src={getFullUrl(imageFile.archivo)}
                                                alt=""
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ) : (
                                        <div
                                            className="w-full h-full flex items-center justify-center border-t border-slate-50 relative overflow-hidden rounded-b-[1.8rem]"
                                            style={{
                                                background: `linear-gradient(135deg, ${catColor}15 0%, ${catColor}40 100%)`
                                            }}
                                        >
                                            {/* Patrón sutil de fondo */}
                                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(${catColor} 1px, transparent 1px)`, backgroundSize: '15px 15px' }} />

                                            <div className="relative group-hover:scale-110 transition-transform duration-500">
                                                <LucidIcon name={cat?.icono} className="w-12 h-12 opacity-20" style={{ color: catColor }} />
                                            </div>

                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-20">
                                                <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: catColor }}>SGAF Bienestar</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Botón flotante estilo premium */}
                                    <div className="absolute bottom-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all p-2 bg-indigo-600 text-white rounded-xl shadow-xl">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Modal de Detalle (Se mantiene Igual de refinado) */}
            <ModalPortal>
                <AnimatePresence>
                    {selectedBenefit && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-end">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setSelectedBenefit(null); setActivePdfPreview(null); }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col overflow-hidden text-left">
                                <div className="p-6 flex items-center justify-between border-b border-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-500"><Heart className="w-6 h-6" /></div>
                                        <h2 className="text-lg font-semibold text-slate-800 leading-none">Detalle del Beneficio</h2>
                                    </div>
                                    <button onClick={() => { setSelectedBenefit(null); setActivePdfPreview(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                                    <span className="px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-white shadow-lg mb-6 inline-block" style={{ backgroundColor: selectedBenefit.categoria_color }}>{categorias.find(c => c.id === selectedBenefit.categoria)?.nombre}</span>
                                    <h1 className="text-2xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">{selectedBenefit.titulo}</h1>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium mb-12 border-l-2 border-slate-100 pl-8 max-w-2xl">{selectedBenefit.descripcion}</p>

                                    <div className="space-y-12">
                                        {/* Galería Visual */}
                                        {selectedBenefit.archivos?.some(f => f.tipo === 'image') && (
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                                    <ImageIcon className="w-4 h-4" />
                                                    Galería de Imágenes
                                                </h4>
                                                <div className="grid grid-cols-1 gap-8">
                                                    {selectedBenefit.archivos.filter(f => f.tipo === 'image').map((f, idx) => (
                                                        <div key={idx} className="group relative rounded-[2.5rem] overflow-hidden border border-slate-50 shadow-2xl shadow-slate-200/50 transition-all cursor-zoom-in active:scale-95" onClick={() => setFullscreenImage(f.archivo)}>
                                                            <img src={getFullUrl(f.archivo)} alt="" className="w-full object-contain bg-slate-50 max-h-[650px] group-hover:scale-105 transition-transform duration-700" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Documentos */}
                                        {selectedBenefit.archivos?.some(f => f.tipo !== 'image') && (
                                            <div className="space-y-4 pb-10">
                                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                                    <FileText className="w-4 h-4" />
                                                    Documentos del Beneficio
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {selectedBenefit.archivos.filter(f => f.tipo !== 'image').map((f, idx) => (
                                                        <a key={idx} href={getFullUrl(f.archivo)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-slate-100 group">
                                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm group-hover:scale-110 transition-transform"><FileText className="w-5 h-5" /></div>
                                                            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-700 truncate">{f.nombre || 'Documento'}</p><p className="text-[10px] text-slate-400 uppercase font-black">{f.tipo}</p></div>
                                                            <Download className="w-4 h-4 text-slate-300" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </ModalPortal>

            {/* Fullscreen Image Preview */}
            <AnimatePresence>
                {fullscreenImage && (
                    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-900/95 backdrop-blur-xl p-4" onClick={() => setFullscreenImage(null)}>
                        <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} src={getFullUrl(fullscreenImage)} className="max-w-full max-h-full rounded-2xl shadow-2xl" />
                        <button className="absolute top-8 right-8 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"><X className="w-8 h-8" /></button>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WelfareWall;
