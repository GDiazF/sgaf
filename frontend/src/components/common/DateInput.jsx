import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

const DateInput = ({ label, value, onChange, required = false, className = "" }) => {
    // Value coming in is YYYY-MM-DD (standard ISO)
    // We want to display DD/MM/YYYY text input

    const [inputValue, setInputValue] = useState('');
    const dateInputRef = useRef(null);

    // Sync external value (YYYY-MM-DD) to internal display (DD/MM/YYYY)
    useEffect(() => {
        if (value) {
            const [year, month, day] = value.split('-');
            setInputValue(`${day}/${month}/${year}`);
        } else {
            setInputValue('');
        }
    }, [value]);

    const handleTextChange = (e) => {
        let text = e.target.value;

        // Simple masking logic: Allow only numbers and slashes
        text = text.replace(/[^0-9/]/g, '');

        // Auto-insert slashes
        if (text.length === 2 && inputValue.length === 1) text += '/';
        if (text.length === 5 && inputValue.length === 4) text += '/';

        // Limit length
        if (text.length > 10) return;

        setInputValue(text);

        // Try to parse and update parent if valid date
        if (text.length === 10) {
            const [day, month, year] = text.split('/');
            const isoDate = `${year}-${month}-${day}`;
            // Simple validation check
            const d = new Date(isoDate);
            if (!isNaN(d.getTime())) {
                onChange(isoDate); // Return string directly
            }
        } else if (text === '') {
            onChange(''); // Return empty string directly
        }
    };

    const handleBlur = () => {
        if (value) {
            const [year, month, day] = value.split('-');
            const displayVal = `${day}/${month}/${year}`;
            if (inputValue !== displayVal && inputValue !== '') {
                setInputValue(displayVal);
            }
        } else if (inputValue !== '') {
            // If it's not a valid 10-char date and field is not empty, reset it
            if (inputValue.length < 10) {
                setInputValue('');
            }
        }
    };

    const handleDateIconClick = () => {
        if (dateInputRef.current && 'showPicker' in dateInputRef.current) {
            dateInputRef.current.showPicker();
        }
    };

    const handleNativeDateChange = (e) => {
        // e.target.value is YYYY-MM-DD
        onChange(e.target.value);
    };

    return (
        <div className={`form-container ${className}`}>
            {label && (
                <label className="form-label">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative group">
                <input
                    type="text"
                    required={required}
                    className="form-input font-mono"
                    value={inputValue}
                    onChange={handleTextChange}
                    onBlur={handleBlur}
                    placeholder="DD/MM/YYYY"
                />

                {/* Calendar Icon Button */}
                <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-blue-500 transition-colors p-1"
                    onClick={handleDateIconClick}
                >
                    <Calendar className="w-4 h-4" />
                </button>

                {/* Hidden Native Date Input */}
                <input
                    ref={dateInputRef}
                    type="date"
                    lang="es-CL"
                    className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                    onChange={handleNativeDateChange}
                    tabIndex={-1}
                />
            </div>
        </div>
    );
};

export default DateInput;
