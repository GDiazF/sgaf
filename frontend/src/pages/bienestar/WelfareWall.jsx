import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Heart, 
    Image as ImageIcon, 
    FileText, 
    ExternalLink, 
    Download,
    ArrowRight,
    Plus,
    X,
    Filter,
    FileIcon,
    ChevronRight,
    MapPin,
    Calendar,
    Eye
} from 'lucide-react';
import api from '../../api';

// --- Portal para el Muro ---
const ModalPortal = ({ children }) => {
    return createPortal(children, document.body);
};

const WelfareWall = ({ limit = null, showFilters = true, sortBy = null }) => {
    const [beneficios, setBeneficios] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedBenefit, setSelectedBenefit] = useState(null);
    const [activePdfPreview, setActivePdfPreview] = useState(null);
    const [fullscreenImage, setFullscreenImage] = useState(null);

    const getFullUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        
        // Detectar si estamos en local o producción
        const isDev = window.location.port !== '' && window.location.port !== '80';
        
        if (isDev) {
            // En desarrollo, intentamos obtener la URL de la API (generalmente puerto 8000)
            let baseUrl = api.defaults.baseURL.replace('/api', '').replace(/\/$/, '');
            
            // Si la API dice localhost pero entramos por IP, corregimos la IP
            if (baseUrl.includes('localhost') && window.location.hostname !== 'localhost') {
                baseUrl = baseUrl.replace('localhost', window.location.hostname);
            }
            return `${baseUrl}${path}`;
        }
        
        // En Producción/Sandbox, usamos rutas relativas (lo más seguro)
        return path;
    };



    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resB, resC] = await Promise.all([
                    api.get('bienestar/beneficios/'),
                    api.get('bienestar/categorias/')
                ]);
                const publicados = (resB.data.results || resB.data).filter(b => b.estado === 'PUBLICADO');
                setBeneficios(publicados);
                setCategorias(resC.data.results || resC.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    let filteredBeneficios = selectedCategory === 'ALL' 
        ? beneficios 
        : beneficios.filter(b => b.categoria === parseInt(selectedCategory));
    
    // Aplicar ordenamiento si se solicita novedades
    if (sortBy === 'newest') {
        filteredBeneficios = [...filteredBeneficios].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
    }
    
    if (limit) filteredBeneficios = filteredBeneficios.slice(0, limit);

    if (loading) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                        Bienestar y Convenios
                    </h3>
                </div>
                {showFilters && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        <button onClick={() => setSelectedCategory('ALL')} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedCategory === 'ALL' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Todos</button>
                        {categorias.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${parseInt(selectedCategory) === cat.id ? 'shadow-lg text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} style={{ backgroundColor: parseInt(selectedCategory) === cat.id ? cat.color : '' }}>{cat.nombre}</button>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 text-left">
                <AnimatePresence>
                    {filteredBeneficios.map((b, i) => {
                        const imageFile = b.archivos?.find(f => f.tipo === 'image');
                        return (
                            <motion.div
                                key={b.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -5 }}
                                onClick={() => setSelectedBenefit(b)}
                                className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group cursor-pointer h-full min-h-[250px]"
                            >
                                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: b.categoria_color }}></div>
                                {imageFile && (
                                    <div className="h-24 overflow-hidden bg-slate-50 border-b border-slate-50">
                                        <img src={getFullUrl(imageFile.archivo)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                )}
                                <div className="p-4 flex flex-col flex-1">
                                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-white shadow-sm w-fit mb-3" style={{ backgroundColor: b.categoria_color }}>{categorias.find(c => c.id === b.categoria)?.nombre}</span>
                                    <h4 className="text-sm font-black text-slate-800 mb-2 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{b.titulo}</h4>
                                    <p className="text-[10px] text-slate-500 font-medium mb-4 line-clamp-2 leading-relaxed italic">{b.descripcion}</p>
                                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-50">
                                        <div className="flex -space-x-2">
                                            {b.archivos?.slice(0, 2).map((f, idx) => (
                                                <div key={idx} className="w-6 h-6 rounded-lg bg-slate-50 border-2 border-white flex items-center justify-center text-slate-300">
                                                    {f.tipo === 'image' ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                                </div>
                                            ))}
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <ModalPortal>
                <AnimatePresence>
                    {selectedBenefit && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-end">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setSelectedBenefit(null); setActivePdfPreview(null); }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative bg-white w-full max-w-6xl h-full shadow-2xl flex flex-col overflow-hidden text-left">
                                <div className="p-8 flex items-center justify-between border-b border-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-500"><Heart className="w-6 h-6" /></div>
                                        <h2 className="text-xl font-black text-slate-900 leading-none mt-1">Detalle del Beneficio</h2>
                                    </div>
                                    <button onClick={() => { setSelectedBenefit(null); setActivePdfPreview(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                                    <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-lg mb-6 inline-block" style={{ backgroundColor: selectedBenefit.categoria_color }}>{categorias.find(c => c.id === selectedBenefit.categoria)?.nombre}</span>
                                    <h1 className="text-3xl font-black text-slate-900 mb-6 leading-tight tracking-tight">{selectedBenefit.titulo}</h1>
                                    <p className="text-base text-slate-600 leading-relaxed font-medium mb-12 italic border-l-4 border-slate-100 pl-6">{selectedBenefit.descripcion}</p>
                                    
                                    <div className="space-y-10">
                                        {/* 1. SECCIÓN DE IMÁGENES (Galería) */}
                                        {selectedBenefit.archivos?.some(f => f.tipo === 'image') && (
                                            <div className="space-y-4">
                                                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500 flex items-center gap-2">
                                                    <ImageIcon className="w-4 h-4" />
                                                    Galería Visual
                                                </h4>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {selectedBenefit.archivos.filter(f => f.tipo === 'image').map((f, idx) => (
                                                        <div key={idx} className="group relative rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-zoom-in" onClick={() => setFullscreenImage(f.archivo)}>
                                                            <img src={getFullUrl(f.archivo)} alt="" className="w-full object-cover max-h-[500px]" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                                                <div className="flex w-full items-center justify-between">
                                                                    <span className="text-white text-xs font-bold uppercase tracking-widest">{f.nombre}</span>
                                                                    <a href={getFullUrl(f.archivo)} download className="p-3 bg-white text-slate-900 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-xl"><Download className="w-4 h-4" /></a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 2. SECCIÓN DE DOCUMENTOS (Compactos) */}
                                        {selectedBenefit.archivos?.some(f => f.tipo !== 'image') && (
                                            <div className="space-y-4">
                                                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                                                    <FileText className="w-4 h-4" />
                                                    Documentación Adjunta
                                                </h4>
                                                
                                                {/* Vista Previa de PDF Activa */}
                                                {activePdfPreview && (
                                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl mb-6 border-4 border-slate-800">
                                                        <div className="bg-slate-800 p-4 flex items-center justify-between text-white">
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Vista Previa</span>
                                                            <button onClick={() => setActivePdfPreview(null)} className="p-1 hover:bg-slate-700 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                                                        </div>
                                                        <iframe src={`${getFullUrl(activePdfPreview)}#toolbar=0`} className="w-full h-[600px]" title="PDF Preview" />
                                                    </motion.div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {selectedBenefit.archivos.filter(f => f.tipo !== 'image').map((f, idx) => (
                                                        <div key={idx} className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${activePdfPreview === f.archivo ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'}`}>
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activePdfPreview === f.archivo ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-500'}`}>
                                                                    <FileText className="w-5 h-5" />
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-[11px] font-bold truncate pr-2">{f.nombre}</span>
                                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${activePdfPreview === f.archivo ? 'text-white/60' : 'text-slate-300'}`}>PDF</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button 
                                                                    onClick={() => setActivePdfPreview(activePdfPreview === f.archivo ? null : f.archivo)} 
                                                                    className={`p-2 rounded-lg transition-all ${activePdfPreview === f.archivo ? 'bg-white text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                                <a 
                                                                    href={getFullUrl(f.archivo)} 
                                                                    download 
                                                                    className={`p-2 rounded-lg transition-all ${activePdfPreview === f.archivo ? 'bg-white/20 text-white hover:bg-white hover:text-indigo-600' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </div>
                                <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex flex-col items-center mt-auto">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">SGAF Institucional</p>
                                    <button onClick={() => { setSelectedBenefit(null); setActivePdfPreview(null); }} className="w-full py-4 bg-white border border-slate-100 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-900 hover:text-white transition-all shadow-sm">Cerrar</button>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {fullscreenImage && (
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-12">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFullscreenImage(null)} className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl" />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative max-w-7xl max-h-full flex flex-col items-center">
                                <button onClick={() => setFullscreenImage(null)} className="absolute -top-12 right-0 p-3 text-white/50 hover:text-white transition-colors bg-white/10 rounded-full backdrop-blur-md"><X className="w-6 h-6" /></button>
                                <img src={getFullUrl(fullscreenImage)} alt="" className="max-w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl border border-white/10" />
                                <div className="mt-8 flex items-center gap-4">
                                     <a href={getFullUrl(fullscreenImage)} download className="flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 hover:text-white transition-all shadow-2xl"><Download className="w-5 h-5" /> Descargar Imagen</a>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </ModalPortal>
        </div>
    );
};

export default WelfareWall;
