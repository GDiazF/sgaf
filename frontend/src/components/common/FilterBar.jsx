import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

const FilterBar = ({ onSearch, placeholder = "Buscar...", initialValue = "", className = "", inputClassName = "", showIcon = true }) => {
    const [searchTerm, setSearchTerm] = useState(initialValue);

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            onSearch(searchTerm);
        }, 400); // 400ms delay

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    const handleClear = () => {
        setSearchTerm("");
    };

    return (
        <div className={`relative flex items-center w-full ${className}`}>
            {showIcon && <Search className="absolute left-4 w-4 h-4 text-slate-400 transition-colors z-10" />}
            <input
                type="text"
                className={`form-input focus:ring-0 ${showIcon ? '!pl-11' : '!pl-4'} !pr-10 border-slate-200 bg-white/50 ${inputClassName}`}
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default FilterBar;
