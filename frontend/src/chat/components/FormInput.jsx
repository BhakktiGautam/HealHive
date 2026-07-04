import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  placeholder = '',
  className = '',
  ...props
}) => {
  const showError = touched && error;
  const isValid = touched && !error && value;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`
            w-full px-4 py-2.5 rounded-lg border transition duration-200
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
            ${showError 
              ? 'border-red-500 bg-red-50' 
              : isValid 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 bg-white'
            }
            ${className}
          `}
          {...props}
        />
        {touched && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {showError && (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        )}
      </div>
      {showError && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;