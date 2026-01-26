import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    // Check sessionStorage for user data (consistent with Dashboard and other components)
    const user = sessionStorage.getItem('user');

    if (!user) {
        // Redirect to the signin page, but save the current location they were trying to go to
        return <Navigate to="/signin" state={{ from: location }} replace />;
    }

    return children;
};

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
