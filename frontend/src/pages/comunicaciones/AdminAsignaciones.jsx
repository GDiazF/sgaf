import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Users, Building2, Plus, Trash2 } from 'lucide-react';
import Select from 'react-select';

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
                api.get('ejecutivos/asignaciones/'),
                api.get('funcionarios/?activos=true&page_size=1000'),
                api.get('establecimientos/?page_size=1000')
            ]);
            setAsignaciones(resAsig.data.results || resAsig.data || []);
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
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Nueva Asignación</h2>
                <form onSubmit={handleAssign} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Funcionario (Ejecutivo)</label>
                        <Select 
                            options={funcionarioOptions}
                            value={funcionarioOptions.find(opt => opt.value === form.funcionario) || null}
                            onChange={(selected) => setForm({...form, funcionario: selected ? selected.value : ''})}
                            placeholder="Buscar y seleccionar..."
                            isClearable
                            className="react-select-container"
                            classNamePrefix="react-select"
                            styles={{
                                control: (base, state) => ({
                                    ...base,
                                    borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                                    boxShadow: state.isFocused ? '0 0 0 2px #c7d2fe' : 'none',
                                    borderRadius: '0.75rem',
                                    padding: '2px',
                                    backgroundColor: '#f8fafc',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        borderColor: '#6366f1'
                                    }
                                }),
                                menu: (base) => ({
                                    ...base,
                                    borderRadius: '0.75rem',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                }),
                                option: (base, state) => ({
                                    ...base,
                                    backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#e0e7ff' : 'white',
                                    color: state.isSelected ? 'white' : '#334155',
                                    cursor: 'pointer',
                                    '&:active': {
                                        backgroundColor: '#818cf8'
                                    }
                                })
                            }}
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Establecimiento</label>
                        <Select 
                            options={establecimientoOptions}
                            value={establecimientoOptions.find(opt => opt.value === form.establecimiento) || null}
                            onChange={(selected) => setForm({...form, establecimiento: selected ? selected.value : ''})}
                            placeholder="Buscar y seleccionar..."
                            isClearable
                            className="react-select-container"
                            classNamePrefix="react-select"
                            styles={{
                                control: (base, state) => ({
                                    ...base,
                                    borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                                    boxShadow: state.isFocused ? '0 0 0 2px #c7d2fe' : 'none',
                                    borderRadius: '0.75rem',
                                    padding: '2px',
                                    backgroundColor: '#f8fafc',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        borderColor: '#6366f1'
                                    }
                                }),
                                menu: (base) => ({
                                    ...base,
                                    borderRadius: '0.75rem',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                }),
                                option: (base, state) => ({
                                    ...base,
                                    backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#e0e7ff' : 'white',
                                    color: state.isSelected ? 'white' : '#334155',
                                    cursor: 'pointer',
                                    '&:active': {
                                        backgroundColor: '#818cf8'
                                    }
                                })
                            }}
                        />
                    </div>
                    <button 
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <Plus className="w-5 h-5" />
                        Asignar
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-widest text-slate-500 font-bold">
                            <th className="px-6 py-4">Ejecutivo</th>
                            <th className="px-6 py-4">Establecimiento</th>
                            <th className="px-6 py-4">Vigencia</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="4" className="text-center py-8 text-slate-400">Cargando...</td></tr>
                        ) : asignaciones.length === 0 ? (
                            <tr><td colSpan="4" className="text-center py-8 text-slate-400">No hay asignaciones registradas.</td></tr>
                        ) : asignaciones.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <span className="font-semibold text-slate-700">{a.funcionario_details?.nombre_funcionario}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-600">{a.establecimiento_details?.nombre}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 text-[10px] uppercase font-black tracking-widest rounded-full ${a.vigente ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                        {a.vigente ? 'Vigente' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleDelete(a.id)}
                                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminAsignaciones;
