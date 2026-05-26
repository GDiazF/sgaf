import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div;

const SearchableSelect = ({
    label,
    options = [],
    value,
    onChange,
    placeholder = "Seleccione una opción...",
    icon: Icon,
    required = false,
    className = "",
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Get current label
    const selectedOption = options.find(opt => String(opt.value) === String(value));
    const displayValue = selectedOption ? selectedOption.label : "";

    // Filter options
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when opening
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (optionValue) => {
        if (disabled) return;
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm("");
    };

    return (
        <div className={`relative w-full min-w-0 ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                    <span>{label}</span> {required && <span className="text-rose-500">*</span>}
                </label>
            )}

            {/* Selection Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`no-global w-full min-w-0 box-border flex items-center justify-between ${Icon ? 'pl-10' : 'px-3'} pr-3 h-10 border rounded-xl outline-none transition-all shadow-sm text-[10px] font-black uppercase tracking-wider select-none relative ${
                    disabled
                        ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                        : isOpen 
                        ? 'border-blue-500 bg-white ring-4 ring-blue-500/5' 
                        : 'border-slate-200 bg-white hover:border-slate-350'
                } ${!disabled && (!displayValue ? 'text-slate-300' : 'text-slate-700')}`}
            >
                {Icon && (
                    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
                )}
                <span className="truncate min-w-0">
                    {displayValue || placeholder}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <MotionDiv
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 right-0 mt-1.5 w-full max-w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[999] overflow-hidden flex flex-col min-w-0"
                    >
                        {/* Search Input */}
                        <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="no-global w-full pl-9 pr-4 h-9 text-[10px] font-bold bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                    placeholder="BUSCAR..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                                />
                            </div>
                        </div>

                        {/* Options List */}
                        <div
                            className="max-h-48 overflow-y-auto custom-scrollbar flex-grow py-1"
                            onWheel={(e) => e.stopPropagation()}
                        >
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleSelect(opt.value)}
                                        className={`w-full min-w-0 text-left px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors hover:bg-slate-50/80 ${
                                            String(opt.value) === String(value) 
                                                ? 'bg-blue-50/50 text-blue-600' 
                                                : 'text-slate-600'
                                        }`}
                                    >
                                        <span className="truncate min-w-0">{opt.label}</span>
                                        {String(opt.value) === String(value) && (
                                            <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3px] shrink-0 ml-2" />
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">
                                    No se encontraron resultados
                                </div>
                            )}
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SearchableSelect;
