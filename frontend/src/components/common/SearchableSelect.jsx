import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SearchableSelect = ({
    label,
    options = [],
    value,
    onChange,
    placeholder = "Seleccione una opción...",
    icon: Icon,
    required = false,
    className = ""
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
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm("");
    };

    return (
        <div className={`space-y-1.5 relative ${className}`} ref={containerRef}>
            {label && (
                <label className="text-xs font-bold text-slate-600 ml-1 block">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Selection Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between transition-all hover:bg-white text-sm font-medium h-[46px] ${isOpen ? 'ring-4 ring-blue-500/10 border-blue-500 bg-white' : ''}`}
            >
                <span className={`truncate ${!displayValue ? 'text-slate-400 font-normal' : 'text-slate-700'}`}>
                    {displayValue || placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-[110] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-64"
                    >
                        {/* Search Input */}
                        <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-blue-500 transition-all font-medium"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    // Prevent form submission if in a form
                                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                                />
                            </div>
                        </div>

                        {/* Options List */}
                        <div className="overflow-y-auto custom-scrollbar flex-grow py-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleSelect(opt.value)}
                                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors hover:bg-blue-50/50 group ${String(opt.value) === String(value) ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 font-medium'}`}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                        {String(opt.value) === String(value) && (
                                            <Check className="w-4 h-4 text-blue-600" />
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-slate-400 text-sm italic">
                                    No se encontraron resultados
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SearchableSelect;
