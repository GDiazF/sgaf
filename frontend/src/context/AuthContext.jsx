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
        const token = getSessionCookie('access_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const currentTime = Date.now() / 1000;
                if (decoded.exp < currentTime) {
                    await refreshToken();
                } else {
                    const response = await api.get('auth/me/');
                    setUser(response.data);
                }
            } catch (error) {
                console.error("Error en verificación:", error);
                logout();
            }
        }
        setLoading(false);
    };

    const login = async (username, password) => {
        try {
            const response = await api.post('token/', { username, password });
            setSessionCookie('access_token', response.data.access);
            setSessionCookie('refresh_token', response.data.refresh);

            // Immediately fetch profile after login
            const profileRes = await api.get('auth/me/');
            setUser(profileRes.data);
            return true;
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const logout = () => {
        removeSessionCookie('access_token');
        removeSessionCookie('refresh_token');
        localStorage.setItem('access_token', 'logout-' + Date.now()); // Disparador para otras pestañas
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

            // Re-fetch profile to be sure
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
        logout,
        loading,
        checkUserStatus // Exported purely for manual refreshes if needed
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
