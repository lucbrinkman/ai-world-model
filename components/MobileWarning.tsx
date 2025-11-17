'use client';

import { useEffect, useState } from 'react';

export default function MobileWarning() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is actually a mobile device based on User-Agent
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
      return mobileKeywords.some(keyword => userAgent.includes(keyword));
    };

    setIsMobile(checkMobile());
  }, []);

  if (!isMobile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-[#0C0A16] z-[9999] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          Desktop Only
        </h1>
        <p className="text-gray-300">
          Map of AI Futures is currently only available on desktop devices.
          Please visit this site on a desktop or laptop computer for the full experience.
        </p>
      </div>
    </div>
  );
}
