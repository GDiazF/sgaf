import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Check, X, AlertCircle, Loader2, Database, ShieldCheck, Landmark, CreditCard, Code } from 'lucide-react';
import api from '../../api';
import { usePermission } from '../../hooks/usePermission';

const MaintainerTable = ({ title, icon: Icon, endpoint, fields, description, modelName }) => {
    const { can } = usePermission();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [isAdding, setIsAdding] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get(endpoint);
            setData(Array.isArray(res.data) ? res.data : (res.data.results || []));
        } catch (err) {
            setError("Error al cargar datos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [endpoint]);

    const handleSave = async (id) => {
        setSaving(true);
        try {
            if (id) {
                await api.put(`${endpoint}${id}/`, editForm);
            } else {
                await api.post(endpoint, editForm);
            }
            setEditingId(null);
            setIsAdding(false);
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
        setEditForm(item);
        setIsAdding(false);
    };

    const startAdd = () => {
        setIsAdding(true);
        setEditingId(null);
        const initialForm = {};
        fields.forEach(f => initialForm[f.name] = '');
        setEditForm(initialForm);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-400 font-medium">Cargando mantenedor...</p>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg leading-tight">{title}</h3>
                        <p className="text-xs text-slate-500 mt-1">{description}</p>
                    </div>
                </div>
                {can(`remuneraciones.add_${modelName}`) && (
                    <button
                        onClick={startAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Registro
                    </button>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80">
                            {fields.map(f => (
                                <th key={f.name} className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">{f.label}</th>
                            ))}
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isAdding && (
                            <tr className="bg-indigo-50/30 animate-in slide-in-from-top-2 duration-300">
                                {fields.map(f => (
                                    <td key={f.name} className="px-6 py-3">
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                            value={editForm[f.name] || ''}
                                            onChange={e => setEditForm({ ...editForm, [f.name]: e.target.value })}
                                            placeholder={`Ingresar ${f.label.toLowerCase()}`}
                                        />
                                    </td>
                                ))}
                                <td className="px-6 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleSave()} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"><Check className="w-4 h-4" /></button>
                                        <button onClick={() => setIsAdding(false)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"><X className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {data.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                {fields.map(f => (
                                    <td key={f.name} className="px-6 py-4">
                                        {editingId === item.id ? (
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                                value={editForm[f.name] || ''}
                                                onChange={e => setEditForm({ ...editForm, [f.name]: e.target.value })}
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-slate-700">{item[f.name]}</span>
                                        )}
                                    </td>
                                ))}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {editingId === item.id ? (
                                            <>
                                                <button onClick={() => handleSave(item.id)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"><Check className="w-4 h-4" /></button>
                                                <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"><X className="w-4 h-4" /></button>
                                            </>
                                        ) : (
                                            <>
                                                {can(`remuneraciones.change_${modelName}`) && (
                                                    <button onClick={() => startEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                )}
                                                {can(`remuneraciones.delete_${modelName}`) && (
                                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && !isAdding && (
                            <tr>
                                <td colSpan={fields.length + 1} className="px-6 py-12 text-center text-slate-400 italic font-medium">No hay registros configurados.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TesoreriaMaintainers = () => {
    const [activeTab, setActiveTab] = useState('bancos');

    const tabs = [
        { id: 'bancos', label: 'Mapeo Bancos', icon: Landmark },
        { id: 'medios', label: 'Medios de Pago', icon: CreditCard },
        { id: 'directos', label: 'Bancos Directos', icon: Code },
        { id: 'valevista', label: 'Config. Vale Vista', icon: Settings },
    ];

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Mantenedores Tesorería</h1>
                    </div>
                    <p className="text-slate-500 text-sm">Configuración avanzada para procesos de conciliación bancaria y pagos.</p>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* Custom Tabs Design */}
                <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1">
                    {activeTab === 'bancos' && (
                        <MaintainerTable
                            title="Mapeo de Bancos"
                            endpoint="remuneraciones/mapeo-bancos/"
                            icon={Landmark}
                            description="Asigna nombres de bancos detectados en archivos a sus códigos internos correspondientes."
                            fields={[
                                { name: 'nombre', label: 'Nombre en Archivo' },
                                { name: 'codigo', label: 'Código Banco' }
                            ]}
                            modelName="mapeobanco"
                        />
                    )}

                    {activeTab === 'medios' && (
                        <MaintainerTable
                            title="Medios de Pago"
                            endpoint="remuneraciones/mapeo-medios-pago/"
                            icon={CreditCard}
                            description="Mapea las glosas de medios de pago a los códigos estandarizados por el proceso financiero."
                            fields={[
                                { name: 'nombre', label: 'Medio de Pago' },
                                { name: 'codigo', label: 'Código Medio' }
                            ]}
                            modelName="mapeomediopago"
                        />
                    )}

                    {activeTab === 'directos' && (
                        <MaintainerTable
                            title="Bancos Directos"
                            endpoint="remuneraciones/mapeo-bancos-directos/"
                            icon={Code}
                            description="Conversión directa de códigos cortos o segmentos a códigos bancarios completos."
                            fields={[
                                { name: 'segmento', label: 'Segmento/Código' },
                                { name: 'codigo_completo', label: 'Código Completo' }
                            ]}
                            modelName="mapeobancodirecto"
                        />
                    )}

                    {activeTab === 'valevista' && (
                        <MaintainerTable
                            title="Configuración Vale Vista"
                            endpoint="remuneraciones/vale-vista-config/"
                            icon={Settings}
                            description="Valores constantes utilizados en la generación de archivos para pagos mediante Vale Vista."
                            fields={[
                                { name: 'clave', label: 'Clave de Configuración' },
                                { name: 'valor', label: 'Valor' },
                                { name: 'descripcion', label: 'Descripción' }
                            ]}
                            modelName="valevistaconfig"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default TesoreriaMaintainers;
