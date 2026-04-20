import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

// Helpers para Cookies (Sesión de navegador)
const setSessionCookie = (name, value) => {
    // Al no poner 'expires', la cookie muere al cerrar el navegador
    document.cookie = `${name}=${value}; path=/; SameSite=Lax`;
};

const getSessionCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

const removeSessionCookie = (name) => {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUserStatus();

        // Sincronizar logout entre pestañas
        const handleStorageChange = (e) => {
            if (e.key === 'access_token' && !getSessionCookie('access_token')) {
                setUser(null);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const checkUserStatus = async () => {
        // No verificar el estado si estamos en la página de login para evitar interferencias
        if (window.location.pathname.includes('/login')) {
            setLoading(false);
            return;
        }

        const token = getSessionCookie('access_token');
        console.log("[AuthContext] Checking user status, token exists:", !!token);
        if (token) {
            try {
                if (typeof token === 'string' && token.split('.').length === 3) {
                    const decoded = jwtDecode(token);
                    const currentTime = Date.now() / 1000;
                    console.log("[AuthContext] Token expiry:", decoded.exp, "Current time:", currentTime);
                    if (decoded.exp < currentTime) {
                        console.log("[AuthContext] Token expired, refreshing...");
                        await refreshToken();
                    } else {
                        console.log("[AuthContext] Token valid, fetching profile...");
                        const response = await api.get('auth/me/');
                        console.log("[AuthContext] User profile fetched:", response.data.username);
                        setUser(response.data);
                    }
                } else {
                    console.log("[AuthContext] Invalid token format");
                    logout();
                }
            } catch (error) {
                console.error("[AuthContext] Error en verificación:", error);
                logout();
            }
        } else {
            console.log("[AuthContext] No token found in cookies");
        }
        setLoading(false);
    };

    const login = async (username, password) => {
        try {
            const response = await api.post('token/', { username, password });

            if (response.data.mfa_required) {
                return response.data;
            }

            setSessionCookie('access_token', response.data.access);
            setSessionCookie('refresh_token', response.data.refresh);

            // Usar los datos del usuario que ahora vienen directamente en la respuesta del login
            if (response.data.user) {
                setUser(response.data.user);
            } else {
                // Fallback por si acaso
                const profileRes = await api.get('auth/me/');
                setUser(profileRes.data);
            }
            return { success: true };
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const verifyMFA = async (mfa_token, code, remember_device, use_method) => {
        try {
            const response = await api.post('token/verify-mfa/', { mfa_token, code, remember_device, use_method });

            if (response.data.access) {
                setSessionCookie('access_token', response.data.access);
                setSessionCookie('refresh_token', response.data.refresh);
            }

            if (response.data.user) {
                setUser(response.data.user);
            } else if (response.data.access) {
                // Solo intentar obtener perfil si tenemos tokens de acceso
                const profileRes = await api.get('auth/me/');
                setUser(profileRes.data);
            }
            return response.data; // Return full response to check mfa_setup_required
        } catch (error) {
            console.error("MFA verification failed", error);
            throw error;
        }
    };

    const completeLogin = (data) => {
        setSessionCookie('access_token', data.access);
        setSessionCookie('refresh_token', data.refresh);
        if (data.user) setUser(data.user);
    };

    const logout = () => {
        removeSessionCookie('access_token');
        removeSessionCookie('refresh_token');
        localStorage.setItem('access_token', 'logout-' + Date.now());
        localStorage.removeItem('access_token');
        setUser(null);
    };

    const refreshToken = async () => {
        const refresh = getSessionCookie('refresh_token');
        if (!refresh) {
            logout();
            return;
        }
        try {
            const response = await api.post('token/refresh/', { refresh });
            setSessionCookie('access_token', response.data.access);
            const profileRes = await api.get('auth/me/');
            setUser(profileRes.data);
            return true;
        } catch (error) {
            console.error("Refresh failed", error);
            logout();
        }
    };

    const value = {
        user,
        login,
        verifyMFA,
        logout,
        loading,
        completeLogin,
        checkUserStatus
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
