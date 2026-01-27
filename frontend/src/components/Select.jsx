import PropTypes from 'prop-types';

const Select = ({
  id,
  name,
  value,
  onChange,
  options,
  label,
  required = false,
  disabled = false,
  error,
  className = '',
}) => {
  // Use id if provided, otherwise fallback to name
  const elementId = id || name;

  return (
    <div className={`mb-6 ${className}`}>
      {label && (
        <label htmlFor={elementId} className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={elementId}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full min-w-[120px] px-3 py-3 pr-10 border rounded-lg text-base transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer appearance-none shadow-sm
          ${error ? 'border-red-500 focus:ring-red-100 dark:focus:ring-red-900/30' : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-100 dark:focus:ring-primary-900/30'}
          focus:outline-none focus:ring-4 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundSize: '1.25rem',
          backgroundPosition: 'right 0.75rem center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <option value="" disabled className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          Select an option...
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="block mt-2 text-red-500 text-sm">{error}</span>}
    </div>
  );
};

Select.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  label: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  className: PropTypes.string,
};

export default Select;

