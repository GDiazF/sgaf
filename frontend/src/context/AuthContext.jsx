import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUserStatus();
    }, []);

    const checkUserStatus = async () => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Check expiry
                const currentTime = Date.now() / 1000;
                if (decoded.exp < currentTime) {
                    await refreshToken();
                } else {
                    // Fetch full profile
                    const response = await api.get('auth/me/');
                    setUser(response.data);
                }
            } catch (error) {
                console.error("Invalid token or profile fetch failed", error);
                logout();
            }
        }
        setLoading(false);
    };

    const login = async (username, password) => {
        try {
            const response = await api.post('token/', { username, password });
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);

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
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
    };

    const refreshToken = async () => {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) {
            logout();
            return;
        }
        try {
            const response = await api.post('token/refresh/', { refresh });
            localStorage.setItem('access_token', response.data.access);

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
