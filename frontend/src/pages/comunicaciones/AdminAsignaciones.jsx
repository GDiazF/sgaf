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
        <div className="space-y-4">
            <div className="bg-white p-3 md:p-4 rounded-[1.5rem] shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        <Plus className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Nueva Asignación</h2>
                </div>
                
                <form onSubmit={handleAssign} className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 w-full space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Funcionario (Ejecutivo)</label>
                        <Select 
                            options={funcionarioOptions}
                            value={funcionarioOptions.find(opt => opt.value === form.funcionario) || null}
                            onChange={(selected) => setForm({...form, funcionario: selected ? selected.value : ''})}
                            placeholder="Buscar ejecutivo..."
                            isClearable
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            className="react-select-container"
                            classNamePrefix="react-select"
                            styles={{
                                control: (base, state) => ({
                                    ...base,
                                    minHeight: '42px',
                                    height: '42px',
                                    borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                                    boxShadow: 'none',
                                    borderRadius: '0.85rem',
                                    backgroundColor: '#f8fafc',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s',
                                    '&:hover': { borderColor: '#6366f1' }
                                }),
                                valueContainer: (base) => ({
                                    ...base,
                                    padding: '0 12px'
                                }),
                                input: (base) => ({
                                    ...base,
                                    margin: '0',
                                    padding: '0',
                                    background: 'transparent !important',
                                    border: 'none !important',
                                    boxShadow: 'none !important',
                                    outline: 'none !important'
                                }),
                                placeholder: (base) => ({
                                    ...base,
                                    color: '#94a3b8'
                                }),
                                singleValue: (base) => ({
                                    ...base,
                                    color: '#334155'
                                }),
                                menu: (base) => ({
                                    ...base,
                                    borderRadius: '1rem',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                    border: '1px border-slate-100',
                                    zIndex: 50
                                }),
                                menuList: (base) => ({
                                    ...base,
                                    padding: '0',
                                    maxHeight: '350px'
                                }),
                                option: (base, state) => ({
                                    ...base,
                                    fontSize: '13px',
                                    padding: '10px 12px',
                                    backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#f1f5f9' : 'white',
                                    color: state.isSelected ? 'white' : '#334155',
                                    cursor: 'pointer',
                                    '&:active': { backgroundColor: '#818cf8' }
                                })
                            }}
                        />
                    </div>

                    <div className="flex-1 w-full space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Establecimiento</label>
                        <Select 
                            options={establecimientoOptions}
                            value={establecimientoOptions.find(opt => opt.value === form.establecimiento) || null}
                            onChange={(selected) => setForm({...form, establecimiento: selected ? selected.value : ''})}
                            placeholder="Seleccionar sede..."
                            isClearable
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            className="react-select-container"
                            classNamePrefix="react-select"
                            styles={{
                                control: (base, state) => ({
                                    ...base,
                                    minHeight: '42px',
                                    height: '42px',
                                    borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                                    boxShadow: 'none',
                                    borderRadius: '0.85rem',
                                    backgroundColor: '#f8fafc',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s',
                                    '&:hover': { borderColor: '#6366f1' }
                                }),
                                valueContainer: (base) => ({
                                    ...base,
                                    padding: '0 12px'
                                }),
                                input: (base) => ({
                                    ...base,
                                    margin: '0',
                                    padding: '0',
                                    background: 'transparent !important',
                                    border: 'none !important',
                                    boxShadow: 'none !important',
                                    outline: 'none !important'
                                }),
                                placeholder: (base) => ({
                                    ...base,
                                    color: '#94a3b8'
                                }),
                                singleValue: (base) => ({
                                    ...base,
                                    color: '#334155'
                                }),
                                menu: (base) => ({
                                    ...base,
                                    borderRadius: '1rem',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                    border: '1px border-slate-100',
                                    zIndex: 50
                                }),
                                menuList: (base) => ({
                                    ...base,
                                    padding: '0',
                                    maxHeight: '350px'
                                }),
                                option: (base, state) => ({
                                    ...base,
                                    fontSize: '13px',
                                    padding: '10px 12px',
                                    backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#f1f5f9' : 'white',
                                    color: state.isSelected ? 'white' : '#334155',
                                    cursor: 'pointer',
                                    '&:active': { backgroundColor: '#818cf8' }
                                })
                            }}
                        />
                    </div>

                    <button 
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-[42px] px-8 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 w-full md:w-auto justify-center shadow-lg shadow-indigo-200 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Asignar
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                            <th className="px-6 py-2.5">Ejecutivo</th>
                            <th className="px-6 py-2.5">Establecimiento</th>
                            <th className="px-6 py-2.5">Vigencia</th>
                            <th className="px-6 py-2.5 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="4" className="text-center py-6 text-slate-400 text-xs font-bold uppercase">Cargando...</td></tr>
                        ) : asignaciones.length === 0 ? (
                            <tr><td colSpan="4" className="text-center py-6 text-slate-400 text-xs font-bold uppercase italic">No hay asignaciones registradas.</td></tr>
                        ) : asignaciones.map(a => (
                            <tr key={a.id} className="hover:bg-indigo-50/20 transition-colors">
                                <td className="px-6 py-1.5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                                            <Users className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-[12px] font-bold text-slate-700 uppercase leading-none">{a.funcionario_details?.nombre_funcionario}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-1.5">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5 text-slate-300" />
                                        <span className="text-[11px] font-bold text-slate-500 uppercase leading-none">{a.establecimiento_details?.nombre}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-1.5">
                                    <span className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-widest rounded-lg ${a.vigente ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                        {a.vigente ? 'Vigente' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="px-6 py-1.5 text-right">
                                    <button 
                                        onClick={() => handleDelete(a.id)}
                                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
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
