import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, userData, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles.length > 0 && userData && !allowedRoles.includes(userData.role)) {
        // Redirect based on role or to a unauthorized page
        if (userData.role === 'admin') return <Navigate to="/admin" replace />;
        if (userData.role === 'instructor') return <Navigate to="/instructor" replace />;
        if (userData.role === 'student') return <Navigate to="/student" replace />;
        return <Navigate to="/" replace />;
    }

    return children;
};
