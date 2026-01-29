import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

const DateInput = ({ label, value, onChange, required = false, className = "" }) => {
    // Value coming in is YYYY-MM-DD (standard)
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
                onChange({ target: { value: isoDate } });
            }
        } else if (text === '') {
            onChange({ target: { value: '' } });
        }
    };

    const handleBlur = () => {
        // validate on blur, reset if invalid?
        // For now, if invalid, we could revert or leave as is. 
        // Let's revert to prop value if invalid to prevent stale state
        if (value) {
            const [year, month, day] = value.split('-');
            if (inputValue !== `${day}/${month}/${year}`) {
                // The text doesn't match the valid date, so reset it (unless user cleared it)
                if (inputValue === '') {
                    onChange({ target: { value: '' } });
                } else {
                    setInputValue(`${day}/${month}/${year}`);
                }
            }
        }
    };

    const handleDateIconClick = () => {
        dateInputRef.current?.showPicker();
    };

    const handleNativeDateChange = (e) => {
        // e.target.value is YYYY-MM-DD
        onChange(e);
    };

    return (
        <div className={`space-y-1 ${className}`}>
            {label && <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>}
            <div className="relative">
                <input
                    type="text"
                    required={required}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm pr-10"
                    value={inputValue}
                    onChange={handleTextChange}
                    onBlur={handleBlur}
                    placeholder="DD/MM/YYYY"
                />

                {/* Calendar Icon Button */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-blue-600 p-1" onClick={handleDateIconClick}>
                    <Calendar className="w-4 h-4" />
                </div>

                {/* Hidden Native Date Input */}
                <input
                    ref={dateInputRef}
                    type="date"
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    style={{ visibility: 'hidden' }} // We use showPicker API
                    onChange={handleNativeDateChange}
                    tabIndex={-1}
                />
            </div>
        </div>
    );
};

export default DateInput;
