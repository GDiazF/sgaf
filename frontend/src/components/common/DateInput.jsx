import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

const COMPACT_INPUT_CLASS =
    'no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 pr-9 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300 placeholder:normal-case';

const isoFromDisplay = (text) => {
    if (!text || text.length !== 10) return null;
    const [day, month, year] = text.split('/');
    if (!day || !month || !year || year.length !== 4) return null;
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return iso;
};

const displayFromIso = (iso) => {
    if (!iso) return '';
    const [year, month, day] = iso.split('-');
    if (!year || !month || !day) return '';
    return `${day}/${month}/${year}`;
};

const DateInput = ({
    label,
    value,
    onChange,
    required = false,
    className = '',
    min,
    max,
    compact = false,
}) => {
    const [inputValue, setInputValue] = useState('');
    const dateInputRef = useRef(null);

    useEffect(() => {
        setInputValue(displayFromIso(value));
    }, [value]);

    const applyIso = (iso) => {
        if (!iso) {
            onChange('');
            return;
        }
        if (min && iso < min) return;
        if (max && iso > max) return;
        onChange(iso);
    };

    const handleTextChange = (e) => {
        let text = e.target.value;
        text = text.replace(/[^0-9/]/g, '');

        if (text.length === 2 && inputValue.length === 1) text += '/';
        if (text.length === 5 && inputValue.length === 4) text += '/';
        if (text.length > 10) return;

        setInputValue(text);

        if (text.length === 10) {
            const iso = isoFromDisplay(text);
            if (iso) applyIso(iso);
        } else if (text === '') {
            onChange('');
        }
    };

    const handleBlur = () => {
        const iso = isoFromDisplay(inputValue);
        if (iso) {
            applyIso(iso);
            setInputValue(displayFromIso(value || iso));
        } else if (inputValue !== '') {
            setInputValue(displayFromIso(value));
        }
    };

    const handleDateIconClick = () => {
        if (dateInputRef.current) {
            if (value) dateInputRef.current.value = value;
            if ('showPicker' in dateInputRef.current) {
                dateInputRef.current.showPicker();
            }
        }
    };

    const handleNativeDateChange = (e) => {
        applyIso(e.target.value);
    };

    const inputEl = (
        <div className="relative group w-full min-w-0">
            <input
                type="text"
                required={required}
                inputMode="numeric"
                className={compact ? COMPACT_INPUT_CLASS : 'no-global w-full min-w-0 box-border h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 pr-9 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300 placeholder:normal-case font-mono'}
                value={inputValue}
                onChange={handleTextChange}
                onBlur={handleBlur}
                placeholder="DD/MM/AAAA"
                aria-label={label || 'Fecha'}
            />
            <button
                type="button"
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors ${compact ? 'text-slate-400 hover:text-blue-600' : 'text-slate-300 group-hover:text-blue-500'}`}
                onClick={handleDateIconClick}
                tabIndex={-1}
                aria-label="Abrir calendario"
            >
                <Calendar className="w-3.5 h-3.5" />
            </button>
            <input
                ref={dateInputRef}
                type="date"
                lang="es-CL"
                value={value || ''}
                min={min}
                max={max}
                className="sr-only"
                onChange={handleNativeDateChange}
                tabIndex={-1}
                aria-hidden
            />
        </div>
    );

    if (compact) {
        return <div className={className}>{inputEl}</div>;
    }

    return (
        <div className={`form-container ${className}`}>
            {label && (
                <label className="form-label">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            {inputEl}
        </div>
    );
};

export default DateInput;
