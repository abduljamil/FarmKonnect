import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

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
        } catch (error) {
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
        return user && roles.includes(user.role);
    };

    const canManageProducts = () => {
        return hasRole('Admin', 'Store Manager'); // string matching based on schema
    };

    const isAdmin = () => {
        return hasRole('Admin');
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
