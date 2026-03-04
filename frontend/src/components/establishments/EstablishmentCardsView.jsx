import React, { useRef, useState } from 'react';
import { Mail, Phone, Globe, X, Printer, Download, SquareUser, Filter, ChevronDown, Check, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EstablishmentCardsView = ({ isOpen, onClose, data, establishmentTypes = [] }) => {
    const printRef = useRef();
    const dropdownRef = useRef();
    const [selectedTypeIds, setSelectedTypeIds] = useState([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isLandscape, setIsLandscape] = useState(false);

    if (!isOpen) return null;

    const filteredData = data.filter(item => {
        const matchesType = selectedTypeIds.length === 0 || selectedTypeIds.includes(String(item.tipo));
        const isActivo = item.activo === true;
        return matchesType && isActivo;
    });

    const toggleType = (id) => {
        const idStr = String(id);
        setSelectedTypeIds(prev =>
            prev.includes(idStr)
                ? prev.filter(t => t !== idStr)
                : [...prev, idStr]
        );
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        const printWindow = window.open('', '_blank', 'width=1200,height=800');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Directorio Institutional - SLEP IQUIQUE</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @page {
                            size: ${isLandscape ? '330mm 216mm' : '216mm 330mm'}; /* Oficio (Legal) Chilean standard */
                            margin: 5mm;
                        }
                        @media print {
                            body { 
                                -webkit-print-color-adjust: exact !important; 
                                print-color-adjust: exact !important;
                                background-color: white !important;
                                margin: 0;
                            }
                            .directory-bg-print {
                                background-color: white !important;
                                min-height: 100vh;
                                padding: 5mm;
                            }
                            .no-print { display: none !important; }
                            .grid-print {
                                display: grid !important;
                                grid-template-columns: repeat(${isLandscape ? '3' : '1'}, 1fr) !important;
                                gap: 15px !important;
                            }
                            .card-print {
                                page-break-inside: avoid;
                                break-inside: avoid;
                                border: 2px solid rgba(16, 185, 129, 0.2) !important;
                                background-color: white !important;
                                color: black !important;
                            }
                            /* Force text colors for print */
                            h1, h3, span { color: black !important; }
                            .bg-emerald-600 { background-color: #059669 !important; }
                            .text-white { color: white !important; }
                        }
                    </style>
                </head>
                <body style="margin: 0; padding: 0;">
                    <div class="directory-bg-print">
                        ${printContent.innerHTML}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex flex-col">
            {/* Header Controls */}
            <div className="flex items-center justify-between p-6 bg-white/5 border-b border-white/10 no-print">
                <div className="flex items-center gap-4 text-white">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <SquareUser className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black italic tracking-tight">Directorio SLEP</h2>
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400 opacity-80">Formato Impresión Oficio</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Multi-select Filter Tool */}
                    <div className="relative">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="flex items-center gap-2 bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-500/30 text-white hover:bg-emerald-900/60 transition-all min-w-[200px] justify-between"
                        >
                            <div className="flex items-center gap-2 px-1">
                                <Filter className="w-4 h-4 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase text-emerald-100">
                                    {selectedTypeIds.length === 0 ? 'TODOS LOS TIPOS' : `${selectedTypeIds.length} SELECCIONADOS`}
                                </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isFilterOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-emerald-500/30 rounded-2xl shadow-2xl p-2 z-20 backdrop-blur-xl"
                                    >
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                            <button
                                                onClick={() => setSelectedTypeIds([])}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all mb-1 ${selectedTypeIds.length === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                <span className="text-[10px] font-black uppercase">MOSTRAR TODOS</span>
                                                {selectedTypeIds.length === 0 && <Check className="w-4 h-4" />}
                                            </button>

                                            <div className="h-px bg-white/5 my-1 mx-2" />

                                            {establishmentTypes.map(t => {
                                                const isSelected = selectedTypeIds.includes(String(t.id));
                                                return (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => toggleType(t.id)}
                                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${isSelected ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                                    >
                                                        <span className="text-[10px] font-black uppercase text-left">{t.nombre}</span>
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600'}`}>
                                                            {isSelected && <Check className="w-3 h-3 font-bold" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        onClick={() => setIsLandscape(!isLandscape)}
                        className={`flex items-center gap-2 bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-500/30 text-white hover:bg-emerald-900/60 transition-all`}
                        title="Cambiar Orientación"
                    >
                        <Globe className={`w-4 h-4 text-emerald-400 transition-transform duration-500 ${isLandscape ? 'rotate-90' : ''}`} />
                        <span className="text-[10px] font-black uppercase text-emerald-100">
                            {isLandscape ? 'HORIZONTAL' : 'VERTICAL'}
                        </span>
                    </button>

                    <button
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black transition-all shadow-lg active:scale-95 ${isPreviewMode ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-900 hover:bg-emerald-50'}`}
                    >
                        <Globe className="w-5 h-5" />
                        {isPreviewMode ? 'Vista Normal' : 'Previsualizar'}
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-white text-emerald-900 px-6 py-2.5 rounded-xl font-black hover:bg-emerald-50 transition-all shadow-lg active:scale-95"
                    >
                        <Printer className="w-5 h-5" />
                        {isPreviewMode ? 'Imprimir / PDF' : 'Imprimir'}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar relative ${isPreviewMode ? 'bg-slate-200 py-12' : 'p-12 directory-bg'}`}>
                <div
                    className={`${isPreviewMode ? `bg-white mx-auto shadow-2xl p-[10mm] ${isLandscape ? 'w-[330mm] min-h-[216mm]' : 'w-[216mm] min-h-[330mm]'} text-slate-900 overflow-hidden` : 'max-w-7xl mx-auto'}`}
                    ref={printRef}
                >
                    {/* Header for PDF/Print */}
                    <div className={`text-center mb-12 ${isPreviewMode ? 'text-slate-800' : 'text-white'}`}>
                        <h1 className="text-4xl font-black tracking-tight mb-2 uppercase">Directorio Institucional</h1>
                        <div className={`inline-flex items-center gap-3 px-5 py-1.5 border rounded-full backdrop-blur-md ${isPreviewMode ? 'bg-emerald-50 border-emerald-500/20' : 'bg-emerald-900/40 border-emerald-500/30'}`}>
                            <span className={`text-xs font-black uppercase tracking-[0.2em] ${isPreviewMode ? 'text-emerald-700' : 'text-emerald-300'}`}>IQUIQUE</span>
                            {selectedTypeIds.length > 0 && (
                                <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className={`text-xs font-black uppercase tracking-[0.2em] ${isPreviewMode ? 'text-slate-700' : 'text-white'}`}>
                                        {selectedTypeIds.length === 1
                                            ? establishmentTypes.find(t => String(t.id) === selectedTypeIds[0])?.nombre
                                            : `${selectedTypeIds.length} TIPOS SELECCIONADOS`}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className={`grid gap-5 grid-print ${isPreviewMode ? (isLandscape ? 'grid-cols-3' : 'grid-cols-1') : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                        <AnimatePresence mode='popLayout'>
                            {filteredData.map((item, index) => {
                                const principalPhone = item.telefonos?.find(p => p.es_principal) || item.telefonos?.[0];

                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{
                                            duration: 0.3,
                                            ease: "easeOut",
                                            delay: index * 0.01
                                        }}
                                        className={`card-print flex flex-col rounded-[22px] shadow-xl border-2 min-h-[160px] transition-all bg-white border-emerald-500/10 overflow-hidden`}
                                    >
                                        {/* Header Section - Full Width Name */}
                                        <div className={`px-4 py-2 border-b flex items-center justify-center min-h-[44px] ${isPreviewMode ? 'bg-emerald-50/50 border-emerald-500/20' : 'bg-emerald-600/5 border-emerald-500/10'}`}>
                                            <h3 className="text-[14px] font-black leading-[1.2] uppercase tracking-tight break-words text-slate-800 text-center" title={item.nombre}>
                                                {item.nombre}
                                            </h3>
                                        </div>

                                        {/* Body Section - Split Layout */}
                                        <div className="flex items-stretch flex-1">
                                            {/* Logo Section */}
                                            <div className="flex items-center justify-center w-28 bg-slate-50/30 p-2 border-r border-slate-100/50">
                                                <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center overflow-hidden bg-white shadow-md">
                                                    {item.logo ? (
                                                        <img src={item.logo} alt={item.nombre} className="w-full h-full object-contain p-1.5" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-xs">
                                                            {item.nombre.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Info Section */}
                                            <div className="flex-1 flex flex-col justify-center py-2.5 pr-4 pl-3.5 overflow-hidden">
                                                <div className="space-y-1.5">
                                                    {/* Director box - Infographic Style */}
                                                    <div className="flex items-center gap-2.5 bg-emerald-600/5 border border-emerald-500/20 text-emerald-950 px-3 py-1.5 rounded-xl shadow-sm min-h-[36px]">
                                                        <div className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0">
                                                            <User className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-[10px] font-black tracking-tight uppercase leading-[1.2] flex-1">
                                                            {item.director || 'SIN DIRECTOR'}
                                                        </span>
                                                    </div>

                                                    {/* Email box - Infographic Style */}
                                                    <div className="flex items-center gap-2.5 bg-emerald-600/5 border border-emerald-500/20 text-emerald-950 px-3 py-1.5 rounded-xl shadow-sm min-h-[36px]">
                                                        <div className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0">
                                                            <Mail className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-[10px] font-black tracking-tight break-all leading-[1.2] flex-1">
                                                            {item.email || 'SIN CORREO'}
                                                        </span>
                                                    </div>

                                                    {/* Phone box - Infographic Style */}
                                                    <div className="flex items-center gap-2.5 bg-emerald-600/5 border border-emerald-500/20 text-emerald-950 px-3 py-1.5 rounded-xl shadow-sm min-h-[36px]">
                                                        <div className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0">
                                                            <Phone className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-[11px] font-black tracking-widest leading-none flex-1">
                                                            {principalPhone?.numero || 'SIN TELEFONO'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .directory-bg {
                    background: radial-gradient(circle at top left, #134e4a 0%, #064e3b 100%);
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.2);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(16, 185, 129, 0.3);
                    border-radius: 10px;
                }
            `}} />
        </div>
    );
};

export default EstablishmentCardsView;
