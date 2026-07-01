import React, { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Pencil, Trash2, ArrowUp, ArrowDown, Save, X, Info, CalendarClock } from 'lucide-react';
import api from '../../api';
import { usePermission } from '../../hooks/usePermission';

const emptyForm = {
  titulo: '',
  imagen: null,
  activa: true,
  orden: 0,
  establecimiento: '',
  fecha_inicio: '',
  fecha_fin: '',
};

const LoginBackgroundsAdmin = () => {
  const { can } = usePermission();
  const [items, setItems] = useState([]);
  const [establecimientos, setEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [useVigencia, setUseVigencia] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [rotationSeconds, setRotationSeconds] = useState(8);
  const [savingRotation, setSavingRotation] = useState(false);

  const canView = can('personalizacion_sistema.view_loginbackgroundimage');
  const canEdit = can('personalizacion_sistema.change_loginbackgroundimage');
  const canAdd = can('personalizacion_sistema.add_loginbackgroundimage');
  const canDelete = can('personalizacion_sistema.delete_loginbackgroundimage');

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [imagesRes, estRes] = await Promise.all([
        api.get('personalizacion/login/backgrounds/'),
        api.get('personalizacion/login/backgrounds/establecimientos/'),
      ]);
      setItems(imagesRes.data.results || imagesRes.data || []);
      setEstablecimientos(Array.isArray(estRes.data) ? estRes.data : []);
      try {
        const configRes = await api.get('personalizacion/login/backgrounds/config/');
        setRotationSeconds(Number(configRes.data?.rotation_seconds || 8));
      } catch {
        setRotationSeconds(8);
      }
    } catch {
      setErrorMsg('No se pudo cargar la información de personalización.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) fetchData();
  }, [canView]);

  const ordered = useMemo(() => [...items].sort((a, b) => (a.orden - b.orden) || (a.id - b.id)), [items]);

  const openCreate = () => {
    setSelected(null);
    setErrorMsg('');
    setOkMsg('');
    setUseVigencia(false);
    setForm({ ...emptyForm, orden: items.length });
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setSelected(item);
    setErrorMsg('');
    setOkMsg('');
    const fechaInicio = item.fecha_inicio ? item.fecha_inicio.slice(0, 16) : '';
    const fechaFin = item.fecha_fin ? item.fecha_fin.slice(0, 16) : '';
    setUseVigencia(!!(fechaInicio || fechaFin));
    setForm({
      titulo: item.titulo || '',
      imagen: null,
      activa: !!item.activa,
      orden: item.orden ?? 0,
      establecimiento: item.establecimiento || '',
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setOkMsg('');

    if (!selected?.id && !form.imagen) {
      setErrorMsg('Debes seleccionar una imagen para crear el registro.');
      setSaving(false);
      return;
    }

    if (useVigencia && form.fecha_inicio && form.fecha_fin && form.fecha_inicio > form.fecha_fin) {
      setErrorMsg('La fecha de inicio no puede ser mayor a la fecha de término.');
      setSaving(false);
      return;
    }

    try {
      const payload = new FormData();
      payload.append('titulo', form.titulo);
      payload.append('activa', form.activa ? 'true' : 'false');
      payload.append('orden', String(form.orden));

      if (form.establecimiento) {
        payload.append('establecimiento', String(form.establecimiento));
      }
      if (useVigencia) {
        if (form.fecha_inicio) payload.append('fecha_inicio', form.fecha_inicio);
        if (form.fecha_fin) payload.append('fecha_fin', form.fecha_fin);
      }
      if (form.imagen) {
        payload.append('imagen', form.imagen);
      }

      if (selected?.id) {
        await api.patch(`personalizacion/login/backgrounds/${selected.id}/`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('personalizacion/login/backgrounds/', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setIsModalOpen(false);
      setForm(emptyForm);
      setUseVigencia(false);
      setOkMsg('Imagen guardada correctamente.');
      await fetchData();
    } catch (err) {
      const apiError = err?.response?.data;
      if (typeof apiError === 'string') setErrorMsg(apiError);
      else if (apiError?.detail) setErrorMsg(apiError.detail);
      else if (apiError && typeof apiError === 'object') {
        const firstKey = Object.keys(apiError)[0];
        const firstValue = apiError[firstKey];
        setErrorMsg(Array.isArray(firstValue) ? firstValue[0] : 'No se pudo guardar la imagen.');
      } else {
        setErrorMsg('No se pudo guardar la imagen.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar imagen?')) return;
    setErrorMsg('');
    setOkMsg('');
    try {
      await api.delete(`personalizacion/login/backgrounds/${id}/`);
      setOkMsg('Imagen eliminada.');
      await fetchData();
    } catch {
      setErrorMsg('No se pudo eliminar la imagen.');
    }
  };

  const toggleActive = async (id) => {
    setErrorMsg('');
    setOkMsg('');
    try {
      await api.post(`personalizacion/login/backgrounds/${id}/toggle-active/`);
      await fetchData();
    } catch {
      setErrorMsg('No se pudo cambiar el estado de la imagen.');
    }
  };

  const moveOrder = (id, direction) => {
    const current = [...ordered];
    const index = current.findIndex((x) => x.id === id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return;
    [current[index], current[targetIndex]] = [current[targetIndex], current[index]];
    setItems(current.map((it, idx) => ({ ...it, orden: idx })));
  };

  const saveOrder = async () => {
    setErrorMsg('');
    setOkMsg('');
    try {
      const orders = items.map((item) => ({ id: item.id, orden: item.orden }));
      await api.patch('personalizacion/login/backgrounds/reorder/', { orders });
      setOkMsg('Orden actualizado.');
      await fetchData();
    } catch {
      setErrorMsg('No se pudo guardar el orden.');
    }
  };

  const saveRotationConfig = async () => {
    setSavingRotation(true);
    setErrorMsg('');
    setOkMsg('');
    try {
      await api.patch('personalizacion/login/backgrounds/config/', {
        rotation_seconds: Number(rotationSeconds),
      });
      setOkMsg('Tiempo de rotación actualizado.');
    } catch (err) {
      const apiError = err?.response?.data;
      if (apiError?.rotation_seconds?.[0]) setErrorMsg(apiError.rotation_seconds[0]);
      else setErrorMsg('No se pudo guardar el tiempo de rotación.');
    } finally {
      setSavingRotation(false);
    }
  };

  if (!canView) return <div className="p-10 text-center font-bold text-slate-400">Acceso denegado.</div>;

  return (
    <div className="p-6 lg:p-8 w-full min-h-screen bg-slate-50/30">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Personalización</h2>
          <p className="text-slate-500 text-sm">Login / Imágenes de fondo</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={saveOrder} className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2">
              <Save className="w-4 h-4" /> Guardar orden
            </button>
          )}
          {canAdd && (
            <button onClick={openCreate} className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2">
              <ImagePlus className="w-4 h-4" /> Nueva imagen
            </button>
          )}
        </div>
      </div>

      {errorMsg && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{errorMsg}</div>}
      {okMsg && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{okMsg}</div>}

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5" />
        <span>El orden define la posición del carrusel: <b>0</b> aparece primero, luego 1, 2, 3...</span>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 flex flex-col md:flex-row md:items-end gap-3">
        <div className="w-full md:w-80">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tiempo de rotación (segundos)</label>
          <input
            type="number"
            min="2"
            max="120"
            value={rotationSeconds}
            onChange={(e) => setRotationSeconds(e.target.value)}
            className="h-10 w-full px-3 border rounded-xl"
          />
        </div>
        <button
          onClick={saveRotationConfig}
          disabled={savingRotation}
          className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
        >
          {savingRotation ? 'Guardando...' : 'Guardar tiempo'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-3 text-xs font-bold text-slate-500 uppercase">Preview</th>
              <th className="p-3 text-xs font-bold text-slate-500 uppercase">Título</th>
              <th className="p-3 text-xs font-bold text-slate-500 uppercase">Estado</th>
              <th className="p-3 text-xs font-bold text-slate-500 uppercase">Orden</th>
              <th className="p-3 text-xs font-bold text-slate-500 uppercase">Establecimiento</th>
              <th className="p-3 text-xs font-bold text-slate-500 uppercase">Vigencia</th>
              <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-400">Cargando...</td></tr>
            ) : ordered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 text-xs">
                <td className="p-3"><img src={item.imagen} alt={item.titulo} className="h-12 w-20 rounded object-cover border border-slate-200" /></td>
                <td className="p-3 font-semibold text-slate-800">{item.titulo}</td>
                <td className="p-3">
                  <button disabled={!canEdit} onClick={() => toggleActive(item.id)} className={`px-2 py-1 rounded-full text-[10px] font-bold ${item.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.activa ? 'ACTIVA' : 'INACTIVA'}
                  </button>
                </td>
                <td className="p-3">{item.orden}</td>
                <td className="p-3">{item.establecimiento_nombre || 'Global'}</td>
                <td className="p-3">{item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString() : '-'} / {item.fecha_fin ? new Date(item.fecha_fin).toLocaleDateString() : '-'}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    {canEdit && <button onClick={() => moveOrder(item.id, 'up')} className="p-2 rounded-lg border border-slate-200"><ArrowUp className="w-4 h-4" /></button>}
                    {canEdit && <button onClick={() => moveOrder(item.id, 'down')} className="p-2 rounded-lg border border-slate-200"><ArrowDown className="w-4 h-4" /></button>}
                    {canEdit && <button onClick={() => openEdit(item)} className="p-2 rounded-lg border border-slate-200"><Pencil className="w-4 h-4" /></button>}
                    {canDelete && <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg border border-red-200 text-red-600"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selected ? 'Editar imagen' : 'Nueva imagen'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Personalización de fondo del login</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-200/70 text-slate-500"><X className="w-4 h-4" /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {errorMsg && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{errorMsg}</div>}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Título</label>
                  <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Fondo principal invierno" className="h-11 w-full px-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Orden</label>
                  <input type="number" min="0" value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} placeholder="0" className="h-11 w-full px-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Establecimiento</label>
                  <select value={form.establecimiento} onChange={(e) => setForm({ ...form, establecimiento: e.target.value })} className="h-11 w-full px-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                    <option value="">Global (sin establecimiento)</option>
                    {establecimientos.map((est) => <option key={est.id} value={est.id}>{est.nombre}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Imagen</label>
                  <label className="h-11 w-full px-3 border border-slate-300 rounded-xl bg-white flex items-center gap-3 cursor-pointer hover:border-slate-400 transition-colors">
                    <span className="h-7 px-3 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 flex items-center">
                      Seleccionar archivo
                    </span>
                    <span className={`text-sm truncate ${form.imagen ? 'text-slate-700' : 'text-slate-400'}`}>
                      {form.imagen ? form.imagen.name : 'Ningún archivo seleccionado'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setForm({ ...form, imagen: e.target.files?.[0] || null })}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 mt-2">
                    {form.imagen ? `Archivo seleccionado: ${form.imagen.name}` : selected ? 'Si no subes una nueva imagen, se conserva la actual.' : 'Selecciona una imagen para el fondo de login.'}
                  </p>
                </div>

                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <input type="checkbox" checked={useVigencia} onChange={(e) => {
                      const checked = e.target.checked;
                      setUseVigencia(checked);
                      if (!checked) setForm((prev) => ({ ...prev, fecha_inicio: '', fecha_fin: '' }));
                    }} />
                    <CalendarClock className="w-4 h-4" /> Definir vigencia por fecha (opcional)
                  </label>

                  {useVigencia && (
                    <div className="mt-3 grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Fecha inicio</label>
                        <input type="datetime-local" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} className="h-11 w-full px-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Fecha término</label>
                        <input type="datetime-local" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} className="h-11 w-full px-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                    </div>
                  )}
                </div>

                <label className="md:col-span-2 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input type="checkbox" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} /> Activa
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex justify-end gap-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="h-10 px-4 rounded-xl bg-white border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100">Cancelar</button>
              <button disabled={saving} type="submit" className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm">{saving ? 'Guardando...' : 'Guardar imagen'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default LoginBackgroundsAdmin;
