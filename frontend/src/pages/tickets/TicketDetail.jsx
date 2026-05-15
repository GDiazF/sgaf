import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MessageSquare, Clock, User, CheckCircle2, AlertCircle, Paperclip, Calendar, History, Loader2, Tag, Building, Briefcase, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

const StatusBadge = ({ status }) => {
    const config = {
        'ABIERTO': { color: 'bg-blue-50 text-blue-700 ring-blue-600/20', label: 'Abierto' },
        'EN_PROGRESO': { color: 'bg-amber-50 text-amber-700 ring-amber-600/20', label: 'En Progreso' },
        'EN_ESPERA': { color: 'bg-slate-50 text-slate-700 ring-slate-600/20', label: 'En Espera' },
        'RESUELTO': { color: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', label: 'Resuelto' },
        'CERRADO': { color: 'bg-slate-100 text-slate-500 ring-slate-500/20', label: 'Cerrado' },
    };
    const { color, label } = config[status] || { color: 'bg-slate-50 text-slate-700 ring-slate-600/20', label: status };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${color}`}>
            {label}
        </span>
    );
};

const PriorityBadge = ({ priority }) => {
    const config = {
        'BAJA': { color: 'bg-slate-50 text-slate-600 ring-slate-500/20', label: 'Baja' },
        'MEDIA': { color: 'bg-blue-50 text-blue-700 ring-blue-600/20', label: 'Media' },
        'ALTA': { color: 'bg-orange-50 text-orange-700 ring-orange-600/20', label: 'Alta' },
        'CRITICA': { color: 'bg-red-50 text-red-700 ring-red-600/20', label: 'Crítica' },
    };
    const { color, label } = config[priority] || { color: 'bg-slate-50 text-slate-600 ring-slate-500/20', label: priority };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${color}`}>
            {label}
        </span>
    );
};

const TicketDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchTicket = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get(`tickets/tickets/${id}/`);
            setTicket(res.data);
            const sortedMessages = (res.data.mensajes || []).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
            setMessages(sortedMessages);
            api.post(`tickets/tickets/${id}/registrar_presencia/`).catch(() => {});
        } catch (error) {
            console.error("Error fetching ticket:", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchTicket();
        const interval = setInterval(() => fetchTicket(true), 5000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        try {
            const res = await api.post(`tickets/tickets/${id}/agregar_mensaje/`, { 
                mensaje: newMessage.trim() 
            });
            setMessages(prev => [...prev, res.data]);
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
            alert("No se pudo enviar el mensaje. Intenta de nuevo.");
        } finally {
            setIsSending(false);
        }
    };

    const updateStatus = async (newStatus) => {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            await api.patch(`tickets/tickets/${id}/`, { estado: newStatus });
            await fetchTicket(true);
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error al actualizar el estado.");
        } finally {
            setIsUpdating(false);
        }
    };

    const autoAssign = async () => {
        try {
            await api.post(`tickets/tickets/${id}/auto_asignar/`);
            fetchTicket(true);
        } catch (error) {
            alert("No tienes permisos para asignarte este ticket.");
        }
    };

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
            <p className="font-medium">Cargando ticket...</p>
        </div>
    );

    if (!ticket) return (
        <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p className="font-medium">Ticket no encontrado</p>
            <button onClick={() => navigate('/tickets')} className="mt-4 text-indigo-600 font-medium hover:underline">Volver a Mesa de Ayuda</button>
        </div>
    );

    const canManage = ticket.user_role?.is_agent || ticket.user_role?.is_admin || ticket.user_role?.is_assigned;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/tickets')}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                            <span className="text-sm font-bold text-indigo-600">{ticket.correlativo}</span>
                            <StatusBadge status={ticket.estado} />
                            <PriorityBadge priority={ticket.prioridad} />
                        </div>
                        <h1 className="text-xl font-bold text-slate-800">{ticket.titulo}</h1>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Column: Thread (8 cols approx) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Original Request */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold uppercase shrink-0">
                                {ticket.creado_por_obj?.nombre_completo?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{ticket.creado_por_obj?.nombre_completo}</p>
                                <p className="text-xs text-slate-500">
                                    {new Date(ticket.fecha_creacion).toLocaleString()} • Solicitud Original
                                </p>
                            </div>
                        </div>
                        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                            {ticket.descripcion}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="space-y-6">
                        {messages.map((msg) => {
                            const isSystem = msg.es_sistema;
                            if (isSystem) {
                                return (
                                    <div key={msg.id} className="flex justify-center">
                                        <span className="px-3 py-1 bg-slate-50 text-slate-500 text-xs rounded-full border border-slate-200 flex items-center gap-2 font-medium">
                                            <Activity className="w-3 h-3" />
                                            {msg.mensaje} • {new Date(msg.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            }

                            const isMe = msg.autor === user?.id;
                            
                            return (
                                <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                        {msg.autor_obj?.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-slate-700">{msg.autor_obj?.username}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">{new Date(msg.fecha).toLocaleString()}</span>
                                        </div>
                                        <div className={`px-4 py-3 rounded-2xl text-sm font-medium ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm shadow-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.mensaje}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Reply Box */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                        <form onSubmit={handleSendMessage}>
                            <textarea 
                                rows={3}
                                placeholder="Escribe tu respuesta aquí..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm transition-all resize-none outline-none font-medium"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                            ></textarea>
                            <div className="flex items-center justify-between mt-3">
                                <span className="text-xs text-slate-400 font-medium">Presiona <kbd className="font-sans px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-[10px] font-bold">Enter</kbd> para enviar</span>
                                <button 
                                    disabled={!newMessage.trim() || isSending}
                                    type="submit" 
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors flex items-center gap-2"
                                >
                                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Enviar
                                </button>
                            </div>
                        </form>
                    </div>

                </div>

                {/* Right Column: Meta Info & Controls (4 cols approx) */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Management Controls */}
                    {canManage && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gestión del Ticket</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                {!ticket.asignado_a && (
                                    <button 
                                        onClick={autoAssign}
                                        className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors border border-indigo-200 flex items-center justify-center gap-2"
                                    >
                                        <User className="w-4 h-4" />
                                        Asignarme este Ticket
                                    </button>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Cambiar Estado</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button disabled={isUpdating} onClick={() => updateStatus('EN_PROGRESO')} className={`py-2 rounded-lg border text-xs font-medium transition-colors ${ticket.estado === 'EN_PROGRESO' ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-inner' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>En Progreso</button>
                                        <button disabled={isUpdating} onClick={() => updateStatus('RESUELTO')} className={`py-2 rounded-lg border text-xs font-medium transition-colors ${ticket.estado === 'RESUELTO' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-inner' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Resuelto</button>
                                        <button disabled={isUpdating} onClick={() => updateStatus('EN_ESPERA')} className={`py-2 rounded-lg border text-xs font-medium transition-colors ${ticket.estado === 'EN_ESPERA' ? 'bg-slate-100 border-slate-300 text-slate-700 shadow-inner' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>En Espera</button>
                                        <button disabled={isUpdating} onClick={() => updateStatus('CERRADO')} className={`py-2 rounded-lg border text-xs font-medium transition-colors ${ticket.estado === 'CERRADO' ? 'bg-slate-800 border-slate-800 text-white shadow-inner' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Cerrado</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Details Info */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Detalles</h3>
                        </div>
                        <div className="p-0">
                            <ul className="divide-y divide-slate-100">
                                <li className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <User className="w-4 h-4" />
                                        <span className="text-sm font-medium">Asignado a</span>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-800">
                                        {ticket.asignado_a_obj?.username || <span className="text-slate-400 italic font-normal">Sin asignar</span>}
                                    </span>
                                </li>
                                <li className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Tag className="w-4 h-4" />
                                        <span className="text-sm font-medium">Categoría</span>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-800 text-right max-w-[140px] truncate" title={ticket.categoria_obj?.nombre}>
                                        {ticket.categoria_obj?.nombre || 'General'}
                                    </span>
                                </li>
                                <li className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Building className="w-4 h-4" />
                                        <span className="text-sm font-medium">Área Destino</span>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-800 text-right max-w-[140px] truncate" title={ticket.area_destino_obj?.nombre}>
                                        {ticket.area_destino_obj?.nombre || 'N/A'}
                                    </span>
                                </li>
                                <li className="flex flex-col px-5 py-3 bg-slate-50/50">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Datos del Solicitante</span>
                                    <span className="text-sm font-bold text-slate-800">{ticket.creado_por_obj?.nombre_completo}</span>
                                    <span className="text-xs text-slate-500 font-medium">RUT: {ticket.creado_por_obj?.rut || 'N/A'}</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Timing */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tiempos</h3>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha de Creación</span>
                                <span className="text-sm font-semibold text-slate-800">{new Date(ticket.fecha_creacion).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Última Actualización</span>
                                <span className="text-sm font-semibold text-slate-800">{new Date(ticket.fecha_actualizacion).toLocaleString()}</span>
                            </div>
                            {ticket.fecha_resolucion && (
                                <div className="flex flex-col gap-1 pt-3 border-t border-slate-100">
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Fecha de Resolución</span>
                                    <span className="text-sm font-semibold text-emerald-700">{new Date(ticket.fecha_resolucion).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default TicketDetail;
