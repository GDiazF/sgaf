import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Save, Trash2 } from 'lucide-react';

const EMPTY_PICKER = { subdireccion: '', departamento: '', unidad: '' };
const MotionDiv = motion.div;

const GestionAtencionDrawer = ({
    isOpen,
    onClose,
    editingId,
    establecimientoNombre,
    form,
    setForm,
    onSubmit,
    subdirecciones = [],
    departamentos = [],
    unidades = [],
    formError = '',
    isSubmitting = false,
}) => {
    const [picker, setPicker] = useState(EMPTY_PICKER);

    useEffect(() => {
        if (!isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPicker(EMPTY_PICKER);
        }
    }, [isOpen]);

    const depFiltrados = picker.subdireccion
        ? departamentos.filter((d) => String(d.subdireccion) === picker.subdireccion)
        : [];
    const uniFiltradas = picker.departamento
        ? unidades.filter((u) => String(u.departamento) === picker.departamento)
        : [];

    const handlePickerSub = (value) => {
        setPicker({ subdireccion: value, departamento: '', unidad: '' });
    };

    const handlePickerDep = (value) => {
        setPicker((prev) => ({ ...prev, departamento: value, unidad: '' }));
    };

    const handleAddDestinatario = () => {
        if (picker.unidad) {
            const id = Number(picker.unidad);
            if (!form.unidades_requeridas.includes(id)) {
                setForm({ ...form, unidades_requeridas: [...form.unidades_requeridas, id] });
            }
        } else if (picker.departamento) {
            const id = Number(picker.departamento);
            if (!form.departamentos_requeridos.includes(id)) {
                setForm({ ...form, departamentos_requeridos: [...form.departamentos_requeridos, id] });
            }
        } else if (picker.subdireccion) {
            const id = Number(picker.subdireccion);
            if (!form.subdirecciones_requeridas.includes(id)) {
                setForm({ ...form, subdirecciones_requeridas: [...form.subdirecciones_requeridas, id] });
            }
        }
        setPicker(EMPTY_PICKER);
    };

    const removeDestinatario = (type, id) => {
        if (type === 'sub') {
            setForm({ ...form, subdirecciones_requeridas: form.subdirecciones_requeridas.filter((i) => i !== id) });
        } else if (type === 'dep') {
            setForm({ ...form, departamentos_requeridos: form.departamentos_requeridos.filter((i) => i !== id) });
        } else if (type === 'uni') {
            setForm({ ...form, unidades_requeridas: form.unidades_requeridas.filter((i) => i !== id) });
        }
    };

    const canAddDestinatario = picker.subdireccion || picker.departamento || picker.unidad;
    const hasDestinatarios =
        form.subdirecciones_requeridas.length > 0 ||
        form.departamentos_requeridos.length > 0 ||
        form.unidades_requeridas.length > 0;

    const selectClass =
        'no-global w-full text-[10px] font-black uppercase tracking-widest px-3 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-blue-500 shadow-sm bg-[url(\'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E\')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat pr-8';

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <MotionDiv
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed top-0 left-0 w-screen h-screen bg-slate-900/60 backdrop-blur-sm z-[9998]"
                    />

                    <MotionDiv
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-[10000] flex flex-col border-l border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex justify-between items-center shrink-0">
                            <div className="min-w-0 pr-4">
                                <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">
                                    {editingId ? 'Editar Atención' : 'Nueva Atención'}
                                </h2>
                                <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 ml-0 select-none line-clamp-1">
                                    {establecimientoNombre}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors shrink-0"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                                {formError && (
                                    <div className="bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100">
                                        {formError}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                        Requerimiento o Asunto
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.requerimiento}
                                        onChange={(e) => setForm({ ...form, requerimiento: e.target.value })}
                                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                        placeholder="Ej: solicitud de personal"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                        Descripción Detallada
                                    </label>
                                    <textarea
                                        value={form.descripcion}
                                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                        className="no-global w-full min-h-[120px] text-[10px] font-bold bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300 resize-none"
                                        placeholder="Detalle de la atención..."
                                    />
                                </div>

                                {editingId && (
                                    <>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                                Estado
                                            </label>
                                            <select
                                                value={form.estado}
                                                onChange={(e) => setForm({ ...form, estado: e.target.value })}
                                                className={selectClass}
                                            >
                                                <option value="PENDIENTE">Pendiente</option>
                                                <option value="EN_PROCESO">En Proceso</option>
                                                <option value="RESPONDIDO">Respondido</option>
                                                <option value="CERRADO">Cerrado</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                                Respuesta
                                            </label>
                                            <textarea
                                                value={form.respuesta}
                                                onChange={(e) => setForm({ ...form, respuesta: e.target.value })}
                                                className="no-global w-full min-h-[80px] text-[10px] font-bold bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300 resize-none"
                                                placeholder="Respuesta o avance..."
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Destinatarios (Opcional)
                                    </h3>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                                Subdirección
                                            </label>
                                            <select
                                                value={picker.subdireccion}
                                                onChange={(e) => handlePickerSub(e.target.value)}
                                                className={selectClass}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {subdirecciones.map((s) => (
                                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                                Departamento
                                            </label>
                                            <select
                                                value={picker.departamento}
                                                onChange={(e) => handlePickerDep(e.target.value)}
                                                disabled={!picker.subdireccion}
                                                className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {depFiltrados.map((d) => (
                                                    <option key={d.id} value={d.id}>{d.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                                Unidad
                                            </label>
                                            <select
                                                value={picker.unidad}
                                                onChange={(e) => setPicker((prev) => ({ ...prev, unidad: e.target.value }))}
                                                disabled={!picker.departamento}
                                                className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {uniFiltradas.map((u) => (
                                                    <option key={u.id} value={u.id}>{u.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleAddDestinatario}
                                            disabled={!canAddDestinatario}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Añadir Destinatario
                                        </button>
                                    </div>

                                    {hasDestinatarios && (
                                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
                                            {form.subdirecciones_requeridas.map((id) => {
                                                const s = subdirecciones.find((x) => x.id === id);
                                                if (!s) return null;
                                                return (
                                                    <div key={`sub-${id}`} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
                                                        <span className="text-[11px] font-medium text-slate-600 uppercase tracking-tighter">
                                                            {s.nombre}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDestinatario('sub', id)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Quitar"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            {form.departamentos_requeridos.map((id) => {
                                                const d = departamentos.find((x) => x.id === id);
                                                if (!d) return null;
                                                return (
                                                    <div key={`dep-${id}`} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
                                                        <span className="text-[11px] font-medium text-slate-600 uppercase tracking-tighter">
                                                            {d.nombre}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDestinatario('dep', id)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Quitar"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            {form.unidades_requeridas.map((id) => {
                                                const u = unidades.find((x) => x.id === id);
                                                if (!u) return null;
                                                return (
                                                    <div key={`uni-${id}`} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
                                                        <span className="text-[11px] font-medium text-slate-600 uppercase tracking-tighter">
                                                            {u.nombre}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDestinatario('uni', id)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Quitar"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="shrink-0 p-4 md:p-6 border-t border-slate-200 bg-slate-50 flex flex-col gap-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingId ? 'Guardar Cambios' : 'Registrar Atención'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </MotionDiv>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default GestionAtencionDrawer;
