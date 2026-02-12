import React, { useRef, useState } from 'react';
import { Mail, Phone, Globe, X, Printer, Download, SquareUser, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EstablishmentCardsView = ({ isOpen, onClose, data, establishmentTypes = [] }) => {
    const printRef = useRef();
    const [filterType, setFilterType] = useState('ALL');

    if (!isOpen) return null;

    const filteredData = data.filter(item => {
        // En el backend, 'tipo' ahora es el ID del FK
        const matchesType = filterType === 'ALL' || String(item.tipo) === String(filterType);
        const isActivo = item.activo === true;
        return matchesType && isActivo;
    });

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
                            size: 216mm 330mm; /* Oficio (Legal) Chilean standard */
                            margin: 10mm;
                        }
                        @media print {
                            body { 
                                -webkit-print-color-adjust: exact !important; 
                                print-color-adjust: exact !important;
                                background-color: #134e4a !important;
                                margin: 0;
                            }
                            .directory-bg-print {
                                background-color: #134e4a !important;
                                min-height: 100vh;
                                padding: 20px;
                            }
                            .no-print { display: none !important; }
                            .grid-print {
                                display: grid !important;
                                grid-template-columns: repeat(2, 1fr) !important;
                                gap: 15px !important;
                            }
                            .card-print {
                                page-break-inside: avoid;
                                break-inside: avoid;
                                border: 2px solid rgba(16, 185, 129, 0.2) !important;
                            }
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
                    {/* Filter Tool */}
                    <div className="flex items-center gap-2 bg-emerald-900/40 p-1.5 rounded-xl border border-emerald-500/30">
                        <div className="flex items-center gap-2 px-3 text-emerald-100/60">
                            <Filter className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase">Filtrar:</span>
                        </div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-emerald-600 text-white text-xs font-black px-4 py-2 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer min-w-[160px]"
                        >
                            <option value="ALL">TODOS LOS TIPOS</option>
                            {establishmentTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.nombre.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-white text-emerald-900 px-6 py-2.5 rounded-xl font-black hover:bg-emerald-50 transition-all shadow-lg active:scale-95"
                    >
                        <Printer className="w-5 h-5" />
                        Imprimir
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
            <div className="flex-1 overflow-y-auto p-12 directory-bg custom-scrollbar relative">
                <div className="max-w-7xl mx-auto" ref={printRef}>
                    {/* Header for PDF/Print */}
                    <div className="text-center mb-12 text-white">
                        <h1 className="text-4xl font-black tracking-tight mb-2 uppercase">Directorio Institucional</h1>
                        <div className="inline-flex items-center gap-3 px-5 py-1.5 bg-emerald-900/40 border border-emerald-500/30 rounded-full backdrop-blur-md">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">IQUIQUE</span>
                            {filterType !== 'ALL' && (
                                <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-white">
                                        {establishmentTypes.find(t => String(t.id) === String(filterType))?.nombre}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 grid-print">
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
                                        className="card-print flex items-stretch bg-white rounded-[22px] p-1.5 shadow-xl border-2 border-emerald-500/10 min-h-[120px]"
                                    >
                                        {/* Logo Section */}
                                        <div className="flex items-center justify-center w-28 bg-slate-50/50 rounded-l-[18px] p-2 border-r border-slate-100">
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
                                        <div className="flex-1 flex flex-col justify-center py-2 pr-4 pl-3.5 overflow-hidden">
                                            <div className="mb-2">
                                                <h3 className="text-[14px] font-black text-slate-800 leading-[1.2] uppercase tracking-tight break-words border-b border-emerald-500/10 pb-1" title={item.nombre}>
                                                    {item.nombre}
                                                </h3>
                                            </div>

                                            <div className="space-y-1.5">
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
