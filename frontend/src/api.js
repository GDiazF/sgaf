import axios from 'axios';

// En desarrollo usa la variable de entorno o el proxy local. En producción prefiere la ruta relativa /api/
const BASE_URL = (import.meta.env.DEV ? import.meta.env.VITE_API_URL : null) || '/api/';

const api = axios.create({
    baseURL: BASE_URL,
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
        // No enviar token en peticiones de login o refresh
        const isAuthPath = config.url.includes('token/');

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

        // Si el error es 401 y no hemos intentado refrescar el token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = getSessionCookie('refresh_token');
                const response = await axios.post(`${BASE_URL.replace('/api/', '')}/api/token/refresh/`, {
                    refresh: refreshToken,
                });

                const { access } = response.data;
                setSessionCookie('access_token', access);

                // Reintentar la petición original con el nuevo token
                originalRequest.headers.Authorization = `Bearer ${access}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Si falla el refresh, limpiar tokens y redirigir al login
                removeSessionCookie('access_token');
                removeSessionCookie('refresh_token');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
