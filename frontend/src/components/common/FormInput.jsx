import React from 'react';

/**
 * Premium FormInput Component
 * Encapsulates label, input, and validation styles into a single reusable unit.
 */
const FormInput = ({
    label,
    id,
    type = "text",
    placeholder,
    required = false,
    value,
    onChange,
    className = "",
    labelClassName = "",
    inputClassName = "",
    icon: Icon,
    multiline = false,
    rows = "3",
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
            {multiline ? (
                <textarea
                    id={id}
                    lang="es"
                    required={required}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    rows={rows}
                    className={`form-input !h-auto py-3 resize-none ${inputClassName}`}
                    {...props}
                />
            ) : (
                <input
                    id={id}
                    type={type}
                    lang="es"
                    required={required}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className={`form-input ${inputClassName}`}
                    {...props}
                />
            )}
        </div>
    );
};

export default FormInput;
