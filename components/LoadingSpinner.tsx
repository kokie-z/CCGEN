import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Generating your image, please wait..." }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <div className="w-16 h-16 border-4 border-sky-400 border-t-transparent border-solid rounded-full animate-spin"></div>
      <p className="text-sky-300 text-lg">{message}</p>
    </div>
  );
};