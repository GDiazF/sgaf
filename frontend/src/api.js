import axios from 'axios';

// En desarrollo usa la variable de entorno o el proxy local. En producción prefiere la ruta relativa /api/
const BASE_URL = (import.meta.env.DEV ? import.meta.env.VITE_API_URL : null) || '/api/';

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

// Helpers para Cookies (Sincronizados con AuthContext)
const getSessionCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

const setSessionCookie = (name, value) => {
    document.cookie = `${name}=${value}; path=/; SameSite=Lax`;
};

const removeSessionCookie = (name) => {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
};

// Interceptor para agregar el token JWT a todas las peticiones
api.interceptors.request.use(
    (config) => {
        const token = getSessionCookie('access_token');
        // No enviar token ni intentar refresh en peticiones de login, mfa o refresh
        const isAuthPath = config.url.includes('token/') || config.url.includes('mfa/');

        if (token && !isAuthPath) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Si el error es 401 y NO es una ruta de autenticación/mfa y no hemos intentado refrescar
        const isAuthPath = originalRequest.url.includes('token/') || originalRequest.url.includes('mfa/');
        if (error.response?.status === 401 && !isAuthPath && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = getSessionCookie('refresh_token');
                if (!refreshToken) throw new Error('No refresh token');

                const response = await axios.post(`${BASE_URL.replace('/api/', '')}/api/token/refresh/`, {
                    refresh: refreshToken,
                });

                const { access } = response.data;
                setSessionCookie('access_token', access);

                originalRequest.headers.Authorization = `Bearer ${access}`;
                return api(originalRequest);
            } catch (refreshError) {
                removeSessionCookie('access_token');
                removeSessionCookie('refresh_token');
                // No redirigir ni relanzar error crítico si ya estamos en login
                if (window.location.pathname.includes('/login')) {
                    return Promise.reject(new Error('Auth failed on login page'));
                }
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
