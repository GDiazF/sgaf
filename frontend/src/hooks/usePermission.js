import { useAuth } from '../context/AuthContext';

/**
 * Hook to check if the current user has a specific permission or role.
 */
export const usePermission = () => {
    const { user } = useAuth();

    const can = (permission) => {
        if (!user) return false;
        if (user.is_superuser) return true;

        // Django permissions are usually in the format 'app_label.codename'
        return user.user_permissions?.includes(permission);
    };

    const hasRole = (roleName) => {
        if (!user) return false;
        if (user.is_superuser) return true;
        return user.groups?.includes(roleName);
    };

    return { can, hasRole, isSuperuser: user?.is_superuser };
};
