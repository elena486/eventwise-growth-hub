import React from 'react';

export default function ReportSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-[#EBEBF5] rounded-xl p-4 animate-pulse">
            <div className="h-7 w-16 bg-[#EBEBF5] rounded mb-2" />
            <div className="h-3 w-20 bg-[#EBEBF5] rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#EBEBF5] rounded-xl p-5 mb-4 animate-pulse">
        <div className="h-4 w-24 bg-[#EBEBF5] rounded mb-3" />
        <div className="h-3 w-full bg-[#EBEBF5] rounded mb-2" />
        <div className="h-3 w-3/4 bg-[#EBEBF5] rounded" />
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-white border border-[#EBEBF5] rounded-xl p-5 mb-4 animate-pulse">
          <div className="h-4 w-32 bg-[#EBEBF5] rounded mb-3" />
          <div className="h-3 w-full bg-[#EBEBF5] rounded mb-2" />
          <div className="h-3 w-5/6 bg-[#EBEBF5] rounded mb-2" />
          <div className="h-3 w-2/3 bg-[#EBEBF5] rounded" />
        </div>
      ))}
    </div>
  );
}