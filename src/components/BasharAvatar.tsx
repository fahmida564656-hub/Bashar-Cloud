import React, { useState } from 'react';
import { Camera } from 'lucide-react';

interface BasharAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showEditBadge?: boolean;
  onEditClick?: () => void;
  className?: string;
  customImage?: string;
}

export const BasharAvatar: React.FC<BasharAvatarProps> = ({
  size = 'md',
  showEditBadge = false,
  onEditClick,
  className = '',
  customImage,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24',
  };

  const badgeSizes = {
    sm: 'w-4 h-4 p-0.5 right-0 bottom-0',
    md: 'w-5 h-5 p-1 right-0 bottom-0',
    lg: 'w-6 h-6 p-1 right-0.5 bottom-0.5',
    xl: 'w-7 h-7 p-1.5 right-1 bottom-1',
  };

  const defaultScreenshotPath = '/assets/aistudio/f35bf583-4d25-4bd1-8245-931dccf4c693_868bd3ed.jfif';
  const imageSource = customImage || defaultScreenshotPath;

  return (
    <div className={`relative inline-block ${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full rounded-full overflow-hidden bg-[#0070f3] ring-2 ring-blue-500/80 shadow-lg relative flex items-center justify-center">
        {!imgError ? (
          // In the screenshot, the boy avatar is centered at x=50%, y=18.5% of the full image
          <div className="relative w-full h-full overflow-hidden rounded-full">
            <img
              src={imageSource}
              alt="Bashar"
              onError={() => setImgError(true)}
              className="absolute w-[530%] max-w-none pointer-events-none select-none"
              style={{
                left: '50.2%',
                top: '18.8%',
                transform: 'translate(-50.2%, -18.8%) scale(1.1)',
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-b from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
            B
          </div>
        )}
      </div>

      {showEditBadge && (
        <button
          type="button"
          onClick={onEditClick}
          className={`absolute rounded-full bg-[#1e293b] text-white ring-2 ring-[#0b111c] flex items-center justify-center hover:bg-blue-600 transition-colors shadow-md ${badgeSizes[size]}`}
          title="Change profile picture"
        >
          <Camera className="w-full h-full text-white" />
        </button>
      )}
    </div>
  );
};
