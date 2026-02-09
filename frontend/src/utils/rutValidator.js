/**
 * Utilidades para validación de RUT chileno
 */

/**
 * Limpia el RUT removiendo puntos y guiones
 */
export const cleanRut = (rut) => {
    return rut.replace(/[.-]/g, '');
};

/**
 * Formatea el RUT al formato estándar: 12345678-9
 */
export const formatRut = (rut) => {
    const cleaned = cleanRut(rut);
    if (cleaned.length < 2) return cleaned;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);

    return `${body}-${dv}`;
};

/**
 * Calcula el dígito verificador de un RUT
 */
export const calculateDV = (rutBody) => {
    let suma = 0;
    let multiplo = 2;

    for (let i = rutBody.length - 1; i >= 0; i--) {
        suma += parseInt(rutBody[i]) * multiplo;
        multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }

    const resto = suma % 11;
    const dv = 11 - resto;

    if (dv === 11) return '0';
    if (dv === 10) return 'K';
    return dv.toString();
};

/**
 * Valida si un RUT es válido
 */
export const validateRut = (rut) => {
    if (!rut || typeof rut !== 'string') {
        return { valid: false, error: 'RUT inválido' };
    }

    const cleaned = cleanRut(rut.toUpperCase());

    // Debe tener al menos 2 caracteres (número + DV)
    if (cleaned.length < 2) {
        return { valid: false, error: 'RUT muy corto' };
    }

    // Separar cuerpo y dígito verificador
    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);

    // El cuerpo debe ser numérico
    if (!/^\d+$/.test(body)) {
        return { valid: false, error: 'RUT debe contener solo números' };
    }

    // El DV debe ser número o K
    if (!/^[\dK]$/.test(dv)) {
        return { valid: false, error: 'Dígito verificador inválido' };
    }

    // Calcular DV esperado
    const expectedDV = calculateDV(body);

    if (dv !== expectedDV) {
        return { valid: false, error: 'Dígito verificador incorrecto' };
    }

    return {
        valid: true,
        formatted: formatRut(rut),
        clean: cleaned
    };
};

/**
 * Hook de React para manejar input de RUT con validación en tiempo real
 */
export const useRutInput = (initialValue = '') => {
    const [rut, setRut] = React.useState(initialValue);
    const [error, setError] = React.useState('');
    const [isValid, setIsValid] = React.useState(false);

    const handleChange = (value) => {
        // Limpiar y formatear
        const cleaned = cleanRut(value);
        const formatted = formatRut(cleaned);
        setRut(formatted);

        // Validar solo si tiene longitud suficiente
        if (cleaned.length >= 2) {
            const validation = validateRut(formatted);
            setIsValid(validation.valid);
            setError(validation.valid ? '' : validation.error);
        } else {
            setIsValid(false);
            setError('');
        }
    };

    return {
        rut,
        setRut: handleChange,
        error,
        isValid,
        formatted: rut
    };
};

// Para uso sin React
import React from 'react';
