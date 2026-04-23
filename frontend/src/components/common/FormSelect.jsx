import React from 'react';

/**
 * Premium FormSelect Component
 * Encapsulates label and native select with premium styling.
 */
const FormSelect = ({
    label,
    id,
    required = false,
    value,
    onChange,
    options = [],
    placeholder = "Seleccione...",
    className = "",
    labelClassName = "",
    inputClassName = "",
    icon: Icon,
    ...props
}) => {
    return (
        <div className={`form-container ${className}`}>
            {label && (
                <label htmlFor={id} className={`form-label ${labelClassName}`}>
                    {Icon && (
                        React.isValidElement(Icon) ? (
                            <span className="flex-shrink-0">{Icon}</span>
                        ) : (
                            <Icon className="w-3.5 h-3.5" />
                        )
                    )}
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <select
                id={id}
                required={required}
                value={value}
                onChange={onChange}
                className={`form-select ${inputClassName}`}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt, idx) => (
                    <option key={idx} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default FormSelect;
