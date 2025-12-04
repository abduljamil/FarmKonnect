import PropTypes from 'prop-types';

const Card = ({ children, title, className = '', variant = 'default' }) => {
  const variants = {
    default: 'bg-white shadow-md hover:shadow-lg',
    feature: 'bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 hover:-translate-y-1 hover:shadow-xl',
    info: 'bg-gray-50 border border-gray-200',
  };

  return (
    <div className={`rounded-xl p-6 transition-all duration-300 ${variants[variant]} ${className}`}>
      {title && <h3 className="text-xl font-semibold mb-4 text-gray-800">{title}</h3>}
      <div className="text-gray-600">{children}</div>
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
