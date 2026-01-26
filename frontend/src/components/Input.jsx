import PropTypes from 'prop-types';

const Input = ({
  type = 'text',
  id,
  name,
  value,
  onChange,
  placeholder,
  label,
  required = false,
  disabled = false,
  error,
  className = '',
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      {label && (
        <label htmlFor={id} className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full px-3 py-3 border rounded-lg text-base transition-all duration-200
          bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
          ${error ? 'border-red-500 focus:ring-red-100 dark:focus:ring-red-900/30' : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-100 dark:focus:ring-primary-900/30'}
          focus:outline-none focus:ring-4 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed`}
      />
      {error && <span className="block mt-2 text-red-500 dark:text-red-400 text-sm">{error}</span>}
    </div>
  );
};

Input.propTypes = {
  type: PropTypes.string,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  label: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  className: PropTypes.string,
};

export default Input;
