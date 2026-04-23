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
        <div className={`form-container relative ${className}`} ref={containerRef}>
            {label && (
                <label className="form-label">
                    {Icon && (
                        React.isValidElement(Icon) ? (
                            <span className="flex-shrink-0">{Icon}</span>
                        ) : (
                            <Icon className="w-2.5 h-2.5 text-blue-500" />
                        )
                    )}
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Selection Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`form-input flex items-center justify-between !py-0 ${isOpen ? 'ring-4 ring-blue-500/5 !border-blue-400' : ''}`}
            >
                <span className={`truncate text-[13px] font-bold ${!displayValue ? 'text-slate-400' : 'text-slate-700'}`}>
                    {displayValue || placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="form-dropdown-container"
                    >
                        {/* Search Input */}
                        <div className="p-3 border-b border-slate-100 bg-slate-50/30">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="form-dropdown-search"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                                />
                            </div>
                        </div>

                        {/* Options List */}
                        <div
                            className="max-h-56 overflow-y-auto custom-scrollbar flex-grow py-1"
                            onWheel={(e) => e.stopPropagation()}
                        >
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleSelect(opt.value)}
                                        className={`form-dropdown-option ${String(opt.value) === String(value) ? 'bg-blue-50/50 text-blue-700' : ''}`}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                        {String(opt.value) === String(value) && (
                                            <Check className="w-4 h-4 text-blue-600 stroke-[3px]" />
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
