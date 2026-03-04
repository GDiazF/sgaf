import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const MonthInput = ({ label, value, onChange, required = false, className = "" }) => {
    // Value coming in is YYYY-MM
    const [isOpen, setIsOpen] = useState(false);
    const [displayValue, setDisplayValue] = useState('');
    const [viewDate, setViewDate] = useState(new Date()); // Date used for navigating years
    const containerRef = useRef(null);

    const MESES = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    useEffect(() => {
        if (value) {
            const [y, m] = value.split('-');
            const date = new Date(parseInt(y), parseInt(m) - 1, 2);
            setDisplayValue(date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase());
            setViewDate(date);
        } else {
            setDisplayValue('');
            setViewDate(new Date());
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMonthSelect = (monthIndex) => {
        const year = viewDate.getFullYear();
        const month = (monthIndex + 1).toString().padStart(2, '0');
        onChange(`${year}-${month}`);
        setIsOpen(false);
    };

    const changeYear = (delta) => {
        const newDate = new Date(viewDate);
        newDate.setFullYear(viewDate.getFullYear() + delta);
        setViewDate(newDate);
    };

    return (
        <div className={`form-container ${className}`} ref={containerRef}>
            {label && (
                <label className="form-label">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="form-input flex items-center justify-between cursor-pointer bg-white group hover:border-blue-300 transition-all"
                >
                    <span className={displayValue ? "text-slate-900 font-bold" : "text-slate-400 font-medium italic"}>
                        {displayValue || "Seleccione periodo..."}
                    </span>
                    <Calendar className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Header: Year selection */}
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-100">
                            <button
                                type="button"
                                onClick={() => changeYear(-1)}
                                className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-blue-500"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-black text-slate-800 tracking-tight">
                                {viewDate.getFullYear()}
                            </span>
                            <button
                                type="button"
                                onClick={() => changeYear(1)}
                                className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-blue-500"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Month Grid */}
                        <div className="p-3 grid grid-cols-3 gap-2">
                            {MESES.map((monthName, idx) => {
                                const isSelected = value === `${viewDate.getFullYear()}-${(idx + 1).toString().padStart(2, '0')}`;
                                return (
                                    <button
                                        key={monthName}
                                        type="button"
                                        onClick={() => handleMonthSelect(idx)}
                                        className={`
                                            py-2.5 px-1 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all
                                            ${isSelected
                                                ? "bg-blue-600 text-white shadow-md shadow-blue-200 ring-2 ring-blue-100"
                                                : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"}
                                        `}
                                    >
                                        {monthName.substring(0, 3)}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer: Quick Actions */}
                        <div className="px-3 py-2 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('');
                                    setIsOpen(false);
                                }}
                                className="text-[9px] font-black text-red-500 uppercase hover:underline"
                            >
                                Limpiar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const now = new Date();
                                    onChange(`${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`);
                                    setIsOpen(false);
                                }}
                                className="text-[9px] font-black text-blue-500 uppercase hover:underline"
                            >
                                Mes Actual
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {required && <input type="hidden" value={value || ''} required />}
        </div>
    );
};

export default MonthInput;
