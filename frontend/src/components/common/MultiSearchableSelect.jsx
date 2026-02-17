import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MultiSearchableSelect Component
 * Allows selecting multiple options using checkboxes in a searchable dropdown.
 */
const MultiSearchableSelect = ({
    label,
    options = [],
    value = [], // Array of selected values
    onChange,
    placeholder = "Seleccione opciones...",
    icon: Icon,
    required = false,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef(null);
    const inputRef = useRef(null);

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

    const handleToggleOption = (optionValue) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];
        onChange(newValue);
    };

    const handleRemoveAll = (e) => {
        e.stopPropagation();
        onChange([]);
    };

    const selectedCount = value?.length || 0;

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
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`form-input flex items-center justify-between cursor-pointer !py-0 ${isOpen ? 'ring-4 ring-blue-500/5 !border-blue-400' : ''}`}
            >
                <div className="flex flex-wrap gap-1 items-center flex-1 min-w-0 pr-2">
                    {selectedCount > 0 ? (
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="bg-blue-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full shrink-0">
                                {selectedCount}
                            </span>
                            <span className="text-slate-700 text-[13px] font-bold truncate">
                                {selectedCount === 1
                                    ? options.find(o => o.value === value[0])?.label
                                    : `${selectedCount} seleccionados`}
                            </span>
                        </div>
                    ) : (
                        <span className="text-slate-400 text-[13px] font-bold">
                            {placeholder}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {selectedCount > 0 && (
                        <button
                            type="button"
                            onClick={handleRemoveAll}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="form-dropdown-container max-h-80"
                    >
                        {/* Search Input */}
                        <div className="p-3 border-b border-slate-100 bg-slate-50/30">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="form-dropdown-search"
                                    placeholder="Buscar opciones..."
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
                                filteredOptions.map((opt) => {
                                    const isSelected = value.includes(opt.value);
                                    return (
                                        <div
                                            key={opt.value}
                                            onClick={() => handleToggleOption(opt.value)}
                                            className={`form-dropdown-option ${isSelected ? 'bg-blue-50/30' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20' : 'border-slate-200 group-hover:border-blue-400 bg-white'}`}>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                                                </div>
                                                <span className={`truncate ${isSelected ? 'text-blue-700 font-bold' : 'text-slate-600'}`}>
                                                    {opt.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="px-4 py-8 text-center text-slate-400 text-sm italic">
                                    No se encontraron resultados
                                </div>
                            )}
                        </div>

                        {/* Footer Status */}
                        {selectedCount > 0 && (
                            <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-between items-center px-4">
                                <span className="text-[10px] uppercase tracking-wider font-black text-slate-400">
                                    {selectedCount} de {options.length} seleccionados
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 p-1 px-2 hover:bg-blue-100/50 rounded-lg transition-colors"
                                >
                                    Listo
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MultiSearchableSelect;
