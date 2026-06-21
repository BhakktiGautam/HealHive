import React from 'react';

const DoctorSkeleton = () => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 animate-pulse border border-gray-100">
      <div className="flex items-start space-x-5">
        {/* Avatar */}
        <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
        
        <div className="flex-1 space-y-3">
          {/* Name */}
          <div className="h-5 bg-gray-200 rounded w-2/3"></div>
          
          {/* Specialty */}
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          
          {/* Rating */}
          <div className="flex items-center space-x-3">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-12"></div>
          </div>
          
          {/* Location */}
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          
          {/* Price */}
          <div className="h-5 bg-gray-200 rounded w-1/4"></div>
          
          {/* Button */}
          <div className="h-11 bg-gray-200 rounded-lg w-full"></div>
        </div>
      </div>
    </div>
  );
};

export default DoctorSkeleton;