import React from 'react';
import { usePermission } from './usePermission';

/**
 * Component to wrap elements that require specific permissions.
 */
export const PermissionGate = ({ permission, children, fallback = null }) => {
    const { can } = usePermission();

    if (can(permission)) {
        return <>{children}</>;
    }

    return fallback;
};
