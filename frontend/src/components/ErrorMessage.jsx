import PropTypes from 'prop-types';

const ErrorMessage = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3 text-red-800 animate-[slideIn_0.3s_ease]">
      <span className="text-xl flex-shrink-0">⚠️</span>
      <span className="flex-1 text-sm font-medium">{message}</span>
      {onClose && (
        <button 
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-200 transition-colors text-lg"
          onClick={onClose} 
          aria-label="Close"
        >
          ✕
        </button>
      )}
    </div>
  );
};

ErrorMessage.propTypes = {
  message: PropTypes.string,
  onClose: PropTypes.func,
};

export default ErrorMessage;
