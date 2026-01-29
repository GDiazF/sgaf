import React, { useState, useEffect } from 'react';
import api from '../../api';
import { DollarSign, Search, Plus, Edit2, Trash2, X, Save, Building2, Calendar, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DateInput from '../../components/common/DateInput';

const PaymentsDashboard = () => {
    const [payments, setPayments] = useState([]);
    const [services, setServices] = useState([]);
    const [establishments, setEstablishments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);

    // Initial state for form
    const initialFormState = {
        servicio: '',
        establecimiento: '',
        fecha_emision: '',
        fecha_vencimiento: '',
        fecha_pago: '',
        nro_documento: '',
        monto_interes: 0,
        monto_total: ''
    };

    const [formData, setFormData] = useState(initialFormState);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [payRes, servRes, estRes] = await Promise.all([
                api.get('registros-pagos/'),
                api.get('servicios/'),
                api.get('establecimientos/')
            ]);
            setPayments(payRes.data);
            setServices(servRes.data);
            setEstablishments(estRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (item) => {
        setFormData({
            servicio: item.servicio,
            establecimiento: item.establecimiento,
            fecha_emision: item.fecha_emision,
            fecha_vencimiento: item.fecha_vencimiento,
            fecha_pago: item.fecha_pago,
            nro_documento: item.nro_documento,
            monto_interes: item.monto_interes,
            monto_total: item.monto_total
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleNew = () => {
        setFormData(initialFormState);
        setEditingId(null);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar este registro de pago?")) return;
        try {
            await api.delete(`registros-pagos/${id}/`);
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        }
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`registros-pagos/${editingId}/`, formData);
            } else {
                await api.post('registros-pagos/', formData);
            }
            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Error al guardar registro.");
        }
    };

    const filteredData = payments.filter(item =>
        item.nro_documento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.servicio_detalle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.establecimiento_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Format currency (CLP)
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    // Format date (YYYY-MM-DD -> DD/MM/YYYY)
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Pagos de Servicios</h2>
                    <p className="text-slate-500">Registro histórico de pagos realizados.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar pago..."
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Registrar Pago</span>
                    </button>
                </div>
            </div>

            {/* Modal Form */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => setShowForm(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800">
                                    {editingId ? 'Editar Pago' : 'Registrar Nuevo Pago'}
                                </h3>
                                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="space-y-6">
                                    {/* Section 1: Context */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-blue-600" />
                                            Contexto del Servicio
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-600">Establecimiento</label>
                                                <select
                                                    required
                                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                                    value={formData.establecimiento}
                                                    onChange={e => {
                                                        setFormData({ ...formData, establecimiento: e.target.value, servicio: '' });
                                                    }}
                                                >
                                                    <option value="">Seleccione...</option>
                                                    {establishments.map(e => (
                                                        <option key={e.id} value={e.id}>{e.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-600">Servicio</label>
                                                <select
                                                    required
                                                    disabled={!formData.establecimiento}
                                                    className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none text-sm transition-all ${!formData.establecimiento ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white focus:ring-2 focus:ring-blue-500'}`}
                                                    value={formData.servicio}
                                                    onChange={e => setFormData({ ...formData, servicio: e.target.value })}
                                                >
                                                    <option value="">
                                                        {!formData.establecimiento ? 'Esperando establecimiento...' : 'Seleccione Servicio...'}
                                                    </option>
                                                    {services
                                                        .filter(s => s.establecimiento == formData.establecimiento)
                                                        .map(s => (
                                                            <option key={s.id} value={s.id}>
                                                                {s.proveedor_nombre} (ID: {s.numero_cliente})
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Document Details */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                            Detalles del Documento
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-600">Nro Documento</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                    value={formData.nro_documento}
                                                    onChange={e => setFormData({ ...formData, nro_documento: e.target.value })}
                                                    placeholder="Ej. Factura 12345"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <DateInput
                                                    label="Emisión"
                                                    required
                                                    value={formData.fecha_emision}
                                                    onChange={e => setFormData({ ...formData, fecha_emision: e.target.value })}
                                                />
                                                <DateInput
                                                    label="Vencimiento"
                                                    required
                                                    value={formData.fecha_vencimiento}
                                                    onChange={e => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                                                />

                                                <div className="space-y-1">
                                                    {/* We can use DateInput here too but let's keep the style consistent or customize it */}
                                                    {/* Special styling for PAGO date? Let's use DateInput but pass class if needed. 
                                                         But DateInput handles standard styling. Let's just wrap it. */}
                                                    <label className="text-xs font-bold text-blue-600 uppercase">Envío a Pago</label>
                                                    <div className="relative">
                                                        {/* Re-implementing essentially DateInput for this specific field to keep the blue border style OR just use DateInput with className */}
                                                        {/* Let's be clean and use DateInput, but we lose the specific Blue border unless we add props. 
                                                             I'll just inject the custom blue style into a custom version locally or accept simpler style. 
                                                             Actually, consistency is better. I will use DateInput. 
                                                             Wait, the user liked the "Montos" section styling. 
                                                             Let's stick to DateInput standard style for consistency across the form. */}
                                                        <DateInput
                                                            value={formData.fecha_pago}
                                                            onChange={e => setFormData({ ...formData, fecha_pago: e.target.value })}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Amounts */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-green-600" />
                                            Montos
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-600">Interés ($)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                    value={formData.monto_interes}
                                                    onChange={e => setFormData({ ...formData, monto_interes: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-800">Monto Total ($)</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                                                    <input
                                                        type="number"
                                                        required
                                                        min="0"
                                                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-900"
                                                        value={formData.monto_total}
                                                        onChange={e => setFormData({ ...formData, monto_total: e.target.value })}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        Guardar Registro
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Table List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Pago</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Documento</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Servicio</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Emisión / Venc.</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Monto Total</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3">
                                    <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        {formatDate(item.fecha_pago)}
                                    </div>
                                </td>
                                <td className="p-3">
                                    <div className="font-mono text-sm font-semibold text-slate-800">{item.nro_documento}</div>
                                </td>
                                <td className="p-3">
                                    <div className="text-sm font-medium text-blue-700">{item.servicio_detalle}</div>
                                    <div className="text-xs text-slate-500">{item.establecimiento_nombre}</div>
                                </td>
                                <td className="p-3 text-xs text-slate-600 space-y-1">
                                    <div>E: {formatDate(item.fecha_emision)}</div>
                                    <div className="text-red-500 font-medium">V: {formatDate(item.fecha_vencimiento)}</div>
                                </td>
                                <td className="p-3 text-right">
                                    <div className="font-bold text-slate-900">{formatCurrency(item.monto_total)}</div>
                                    {item.monto_interes > 0 && (
                                        <div className="text-xs text-amber-600">+ {formatCurrency(item.monto_interes)} int.</div>
                                    )}
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredData.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-400">
                        <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron pagos registrados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentsDashboard;
