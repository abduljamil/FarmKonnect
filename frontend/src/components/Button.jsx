import PropTypes from 'prop-types';

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  loading = false,
  className = '',
}) => {
  const baseStyles = 'px-6 py-3 rounded-lg font-semibold transition-all duration-200 inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900';

  const variants = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 hover:-translate-y-0.5 hover:shadow-lg',
    secondary: 'bg-gray-600 dark:bg-gray-700 text-white hover:bg-gray-700 dark:hover:bg-gray-600 hover:-translate-y-0.5',
    danger: 'bg-red-500 text-white hover:bg-red-600 hover:-translate-y-0.5',
    success: 'bg-primary-500 text-white hover:bg-primary-600 hover:-translate-y-0.5',
    outline: 'bg-transparent border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:-translate-y-0.5',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'outline']),
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  loading: PropTypes.bool,
  className: PropTypes.string,
};

export default Button;
