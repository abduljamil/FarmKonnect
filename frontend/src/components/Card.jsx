import PropTypes from 'prop-types';

const Card = ({ children, title, className = '', variant = 'default' }) => {
  const variants = {
    default: 'bg-white dark:bg-gray-800 shadow-md hover:shadow-lg dark:shadow-gray-900/30',
    feature: 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 border border-primary-200 dark:border-primary-700 hover:-translate-y-1 hover:shadow-xl',
    info: 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  };

  return (
    <div className={`rounded-xl p-6 transition-all duration-300 ${variants[variant]} ${className}`}>
      {title && <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">{title}</h3>}
      <div className="text-gray-600 dark:text-gray-300">{children}</div>
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'feature', 'info']),
};

export default Card;
