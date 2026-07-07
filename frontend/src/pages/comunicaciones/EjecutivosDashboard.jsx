import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Building2, Loader2, Eye, FolderSearch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BTN_PRIMARY, LOADER_SPIN, ICON_BOX, CARD_HOVER } from './comunicacionesUi';

const EjecutivoDashboard = () => {
    const [asignaciones, setAsignaciones] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMisEstablecimientos = async () => {
            try {
                const res = await api.get('ejecutivos/asignaciones/mis_asignaciones/');
                const data = res.data.results || res.data;
                setAsignaciones(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error(error);
                setAsignaciones([]);
            } finally {
                setLoading(false);
            }
        };
        fetchMisEstablecimientos();
    }, []);

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0 select-none">
                Mis Establecimientos
            </h3>

            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-auto flex-1 min-h-0 p-4 flex flex-col gap-3 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 flex-1 gap-3 min-h-[200px]">
                            <Loader2 className={LOADER_SPIN} />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">
                                Cargando Datos...
                            </span>
                        </div>
                    ) : asignaciones.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center flex-1 min-h-[200px]">
                            <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                                No tienes establecimientos asignados
                            </span>
                        </div>
                    ) : (
                        asignaciones.map((a) => (
                            <div
                                key={a.id}
                                className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-[auto_1fr_5rem_5.5rem_auto] sm:items-center gap-3 sm:gap-4 transition-all ${CARD_HOVER}`}
                            >
                                <div className={`${ICON_BOX} sm:row-span-1`}>
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 sm:col-start-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:hidden">Establecimiento</p>
                                    <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter line-clamp-2">
                                        {a.establecimiento_details?.nombre}
                                    </p>
                                </div>
                                <div className="sm:text-center shrink-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:hidden">RBD</p>
                                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-tighter">
                                        {a.establecimiento_details?.rbd ?? '—'}
                                    </p>
                                </div>
                                <div className="sm:text-center shrink-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:hidden">Estado</p>
                                    <span className="inline-block text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter bg-emerald-50 text-emerald-600 border-emerald-100">
                                        {a.vigente !== false ? 'Vigente' : 'Inactivo'}
                                    </span>
                                </div>
                                <Link
                                    to={`/comunicaciones/ejecutivos/gestion/${a.establecimiento_details?.id}`}
                                    className={`${BTN_PRIMARY} sm:justify-self-end`}
                                >
                                    <Eye className="w-4 h-4" />
                                    Gestionar
                                </Link>
                            </div>
                        ))
                    )}
                </div>

                {!loading && asignaciones.length > 0 && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest select-none">
                            {asignaciones.length} establecimiento{asignaciones.length !== 1 ? 's' : ''} asignado{asignaciones.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EjecutivoDashboard;
