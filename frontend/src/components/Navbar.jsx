import PropTypes from 'prop-types';

const Navbar = ({ user, onLogout }) => {
  return (
    <nav className="bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-white text-3xl font-bold">🌾 FarmKonnect</h1>
          <div className="flex items-center gap-4">
            <span className="text-white font-medium">Welcome, {user.name}!</span>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium capitalize">
              {user.role}
            </span>
            <button 
              onClick={onLogout} 
              className="bg-white text-primary-500 px-5 py-2 rounded-lg font-semibold hover:bg-primary-50 transition-all duration-200 hover:-translate-y-0.5"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

Navbar.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default Navbar;
