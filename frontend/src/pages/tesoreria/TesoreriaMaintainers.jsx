import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Settings, Plus, Trash2, Edit2, Check, X,
    Loader2, Landmark, CreditCard, Code, ShieldCheck,
    ChevronRight, Save, Info
} from 'lucide-react';
import api from '../../api';
import { usePermission } from '../../hooks/usePermission';

const MaintainerTable = ({ title, icon: Icon, endpoint, fields, description, permissionModel }) => {
    const { can } = usePermission();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Dynamic Permission Checks
    const canAdd = can(`remuneraciones.add_${permissionModel}`);
    const canChange = can(`remuneraciones.change_${permissionModel}`);
    const canDelete = can(`remuneraciones.delete_${permissionModel}`);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get(endpoint);
            setData(Array.isArray(res.data) ? res.data : (res.data.results || []));
        } catch (err) {
            console.error("Error al cargar datos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [endpoint]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId) {
                await api.put(`${endpoint}${editingId}/`, editForm);
            } else {
                await api.post(endpoint, editForm);
            }
            setIsModalOpen(false);
            setEditingId(null);
            setEditForm({});
            fetchData();
        } catch (err) {
            alert("Error al guardar: " + JSON.stringify(err.response?.data || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar este registro?")) return;
        try {
            await api.delete(`${endpoint}${id}/`);
            fetchData();
        } catch (err) {
            alert("Error al eliminar.");
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditForm({ ...item });
        setIsModalOpen(true);
    };

    const startAdd = () => {
        setEditingId(null);
        const initialForm = {};
        fields.forEach(f => initialForm[f.name] = '');
        setEditForm(initialForm);
        setIsModalOpen(true);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm animate-pulse">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Sincronizando...</p>
        </div>
    );

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 md:p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 flex-shrink-0">
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base leading-tight">{title}</h3>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 uppercase tracking-wide truncate max-w-[250px] md:max-w-none">{description}</p>
                        </div>
                    </div>
                    {canAdd && (
                        <button
                            onClick={startAdd}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                        >
                            <Plus className="w-3.5 h-3.5" /> Nuevo Registro
                        </button>
                    )}
                </div>

                {/* VISTA MOBILE (Cards) - Más compactas */}
                <div className="md:hidden divide-y divide-slate-50">
                    {data.map(item => (
                        <div key={item.id} className="p-4 space-y-2 active:bg-slate-50/50 transition-colors">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                {fields.map(f => (
                                    <div key={f.name}>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{f.label}</p>
                                        <p className="text-xs font-bold text-slate-700 truncate">{item[f.name]}</p>
                                    </div>
                                ))}
                            </div>
                            {(canChange || canDelete) && (
                                <div className="flex gap-2 pt-1">
                                    {canChange && (
                                        <button
                                            onClick={() => startEdit(item)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold active:scale-95"
                                        >
                                            <Edit2 className="w-3 h-3" /> Editar
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold active:scale-95"
                                        >
                                            <Trash2 className="w-3 h-3" /> Borrar
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* VISTA DESKTOP (Table) - Fuentes reducidas y padding optimizado */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-slate-50/30">
                                {fields.map(f => (
                                    <th key={f.name} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{f.label}</th>
                                ))}
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right w-32">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    {fields.map(f => (
                                        <td key={f.name} className="px-6 py-3.5">
                                            <span className="text-xs font-semibold text-slate-600 truncate block">{item[f.name]}</span>
                                        </td>
                                    ))}
                                    <td className="px-6 py-3.5 text-right">
                                        <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            {canChange && (
                                                <button onClick={() => startEdit(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                                            )}
                                            {canDelete && (
                                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {data.length === 0 && (
                    <div className="p-10 text-center flex flex-col items-center">
                        <Info className="w-6 h-6 text-slate-200 mb-2" />
                        <p className="text-slate-300 font-bold uppercase tracking-widest text-[9px]">Sin registros</p>
                    </div>
                )}
            </div>

            {/* MODAL EDIT / ADD (Responsive: Floating Card on Mobile) */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-[1000] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white flex-shrink-0">
                            <div>
                                <h3 className="font-bold text-base">{editingId ? 'Editar Registro' : 'Nuevo Registro'}</h3>
                                <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Módulo de Configuración</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                            {fields.map(f => (
                                <div key={f.name} className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-xl text-xs font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                        value={editForm[f.name] || ''}
                                        onChange={e => setEditForm({ ...editForm, [f.name]: e.target.value })}
                                        placeholder={`Ingresar ${f.label.toLowerCase()}...`}
                                    />
                                </div>
                            ))}
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    {editingId ? 'Guardar' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const TesoreriaMaintainers = () => {
    const [activeTab, setActiveTab] = useState('bancos');

    const tabs = [
        { id: 'bancos', label: 'Bancos', icon: Landmark },
        { id: 'medios', label: 'Medios Pago', icon: CreditCard },
        { id: 'directos', label: 'Cod. Directos', icon: Code },
        { id: 'valevista', label: 'Vale Vista', icon: Settings },
    ];

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 min-h-screen mx-auto overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 text-white">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Tesorería</h1>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Configuración y Mapeos</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar scroll-smooth">
                    <div className="flex min-w-max md:min-w-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-bold transition-all duration-300 whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1">
                    {activeTab === 'bancos' && (
                        <MaintainerTable
                            title="Mapeo de Bancos"
                            endpoint="remuneraciones/mapeo-bancos/"
                            icon={Landmark}
                            description="Nombres en archivos a códigos bancarios."
                            permissionModel="mapeobanco"
                            fields={[
                                { name: 'nombre', label: 'Nombre en Archivo' },
                                { name: 'codigo', label: 'Código Banco' }
                            ]}
                        />
                    )}

                    {activeTab === 'medios' && (
                        <MaintainerTable
                            title="Medios de Pago"
                            endpoint="remuneraciones/mapeo-medios-pago/"
                            icon={CreditCard}
                            description="Glosas a códigos internos."
                            permissionModel="mapeomediospago"
                            fields={[
                                { name: 'nombre', label: 'Glosa Medio' },
                                { name: 'codigo', label: 'Código Medio' }
                            ]}
                        />
                    )}

                    {activeTab === 'directos' && (
                        <MaintainerTable
                            title="Bancos Directos"
                            endpoint="remuneraciones/mapeo-bancos-directos/"
                            icon={Code}
                            description="Segmentos a códigos de 11 dígitos."
                            permissionModel="mapeobancosdirectos"
                            fields={[
                                { name: 'segmento', label: 'Segmento' },
                                { name: 'codigo_completo', label: 'Cód. Completo' }
                            ]}
                        />
                    )}

                    {activeTab === 'valevista' && (
                        <MaintainerTable
                            title="Configuración Vale Vista"
                            endpoint="remuneraciones/vale-vista-config/"
                            icon={Settings}
                            description="Parámetros para archivos de retiro."
                            permissionModel="valevistaconfig"
                            fields={[
                                { name: 'clave', label: 'Parámetro' },
                                { name: 'valor', label: 'Valor' },
                                { name: 'descripcion', label: 'Descripción' }
                            ]}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default TesoreriaMaintainers;
