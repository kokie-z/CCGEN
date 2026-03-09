
import React from 'react';

interface ImageDisplayProps {
  imageUrl: string;
  altText?: string;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ imageUrl, altText = "Generated Image" }) => {
  return (
    <div className="w-full max-w-lg aspect-square bg-slate-700 rounded-lg shadow-lg overflow-hidden">
      <img 
        src={imageUrl} 
        alt={altText} 
        className="w-full h-full object-contain" 
      />
    </div>
  );
};
