import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Users, Building2, Plus, Trash2 } from 'lucide-react';
import SearchableSelect from '../../components/common/SearchableSelect';
import { BTN_PRIMARY, ICON_BOX_SM, ICON_SM, AVATAR_ICON } from './comunicacionesUi';

const AdminAsignaciones = () => {
    const [asignaciones, setAsignaciones] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [establecimientos, setEstablecimientos] = useState([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({ funcionario: '', establecimiento: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resAsig, resFunc, resEst] = await Promise.all([
                api.get('ejecutivos/asignaciones/?page_size=1000'),
                api.get('funcionarios/?activos=true&page_size=1000'),
                api.get('establecimientos/?page_size=1000')
            ]);
            const data = resAsig.data.results || resAsig.data;
            setAsignaciones(Array.isArray(data) ? data : []);
            setFuncionarios(resFunc.data.results || resFunc.data || []);
            setEstablecimientos(resEst.data.results || resEst.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        try {
            await api.post('ejecutivos/asignaciones/', form);
            setForm({ funcionario: '', establecimiento: '' });
            fetchData();
        } catch (error) {
            alert('Error al asignar o ya existe la asignación.');
        }
    };

    const handleDelete = async (id) => {
        if(window.confirm('¿Eliminar asignación?')) {
            try {
                await api.delete(`ejecutivos/asignaciones/${id}/`);
                fetchData();
            } catch (error) {
                console.error(error);
            }
        }
    };

    const funcionarioOptions = funcionarios.map(f => ({ value: f.id, label: f.nombre_funcionario }));
    const establecimientoOptions = establecimientos.map(e => ({ value: e.id, label: e.nombre }));

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-4">
            <div className="bg-white p-3 md:p-4 rounded-[1.5rem] shadow-sm border border-slate-200 shrink-0">
                <div className="flex items-center gap-3 mb-6">
                    <div className={ICON_BOX_SM}>
                        <Plus className={ICON_SM} />
                    </div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Nueva Asignación</h2>
                </div>
                
                <form onSubmit={handleAssign} className="flex flex-col md:flex-row gap-6 items-end w-full">
                    <SearchableSelect 
                        options={funcionarioOptions}
                        value={form.funcionario}
                        onChange={(selected) => setForm({...form, funcionario: selected})}
                        placeholder="BUSCAR EJECUTIVO..."
                        label="Funcionario (Ejecutivo)"
                        icon={Users}
                        className="flex-1"
                    />

                    <SearchableSelect 
                        options={establecimientoOptions}
                        value={form.establecimiento}
                        onChange={(selected) => setForm({...form, establecimiento: selected})}
                        placeholder="SELECCIONAR SEDE..."
                        label="Establecimiento"
                        icon={Building2}
                        className="flex-1"
                    />

                    <button 
                        type="submit"
                        className={`${BTN_PRIMARY} w-full md:w-auto justify-center shrink-0`}
                    >
                        <Plus className="w-4 h-4" />
                        Asignar
                    </button>
                </form>
            </div>

            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-auto flex-1 min-h-0 bg-white custom-scrollbar">
                    <table className="w-full text-left border-collapse border-spacing-0">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 shadow-sm">
                                <th className="px-4 py-3 border-r border-slate-100 bg-slate-50">Ejecutivo</th>
                                <th className="px-4 py-3 border-r border-slate-100 bg-slate-50">Establecimiento</th>
                                <th className="px-4 py-3 border-r border-slate-100 bg-slate-50">Vigencia</th>
                                <th className="px-4 py-3 text-center w-24 bg-slate-50">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="4" className="text-center py-6 text-slate-400 text-xs font-bold uppercase">Cargando...</td></tr>
                        ) : asignaciones.length === 0 ? (
                            <tr><td colSpan="4" className="text-center py-6 text-slate-400 text-xs font-bold uppercase italic">No hay asignaciones registradas.</td></tr>
                        ) : asignaciones.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-4 py-2 border-r border-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className={AVATAR_ICON}>
                                            <Users className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-tighter leading-none line-clamp-1">{a.funcionario_details?.nombre_funcionario}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-2 border-r border-slate-50">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-tighter leading-none line-clamp-1">{a.establecimiento_details?.nombre}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-2 border-r border-slate-50">
                                    <span className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-widest rounded-lg ${a.vigente ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                        {a.vigente ? 'Vigente' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(a.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Eliminar asignación"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {loading ? 'Cargando...' : `${asignaciones.length} asignación${asignaciones.length !== 1 ? 'es' : ''}`}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AdminAsignaciones;
