import React from "react";
import PropTypes from "prop-types";

const Select = ({
  id,
  name,
  value,
  onChange,
  options,
  label,
  placeholder = "Select an option...",
  required = false,
  disabled = false,
  error,
  className = "",
  containerClassName = "",
}) => {
  return (
    <div className={`mb-6 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={id}
          className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-100"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full px-4 py-2.5
          bg-white dark:bg-gray-900
          border border-gray-300 dark:border-gray-600
          rounded-lg
          text-gray-900 dark:text-white
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          transition-all duration-200
          disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
          cursor-pointer
          ${error ? "border-red-500 focus:ring-red-500" : ""}
          ${className}`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="block mt-2 text-red-500 text-sm">{error}</span>
      )}
    </div>
  );
};

Select.propTypes = {
  id: PropTypes.string.isRequired,
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
