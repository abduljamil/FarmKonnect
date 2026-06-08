import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if user is logged in on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await authAPI.getMe();
            if (response.user || response.data?.user) {
                // API might return { user: ... } or { data: { user: ... } } or { data: user }
                // Based on api.js checkAuth calling /auth/me
                // Usually apiCall returns response.json().
                // Let's assume response structure matches what SignIn expects
                setUser(response.user || response.data?.user);
            }
        } catch (error) { // eslint-disable-line no-unused-vars
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        try {
            const response = await authAPI.login(credentials);
            // login returns { token, user: ... } usually
            if (response.token || response.user) {
                setUser(response.user);
                return { success: true };
            }
            return { success: false, message: 'Login failed' };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Login failed'
            };
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
            setUser(null);
            // Clear storage if used (SignIn uses sessionStorage)
            sessionStorage.removeItem("user");
            // localStorage.removeItem("token"); // Token is handling by cookie now
            localStorage.removeItem("user");
        } catch (error) {
            console.error('Logout error:', error);
            setUser(null);
        }
    };

    const hasRole = (...roles) => {
        // Backend schema enum is ['user', 'admin'] (lowercase). Normalize the
        // input so callers can pass either case without it silently failing.
        return !!user && roles.map((r) => r.toLowerCase()).includes((user.role || '').toLowerCase());
    };

    // FarmKonnect doesn't have a "Store Manager" role; only listing owners
    // can manage their own products. Admins can manage anything.
    const canManageProducts = () => {
        return hasRole('admin');
    };

    const isAdmin = () => {
        return hasRole('admin');
    };

    const value = {
        user,
        loading,
        login,
        logout,
        checkAuth,
        hasRole,
        canManageProducts,
        isAdmin,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
