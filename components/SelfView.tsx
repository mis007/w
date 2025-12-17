import React, { useEffect, useRef } from 'react';

const SelfView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startVideo = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to access camera for self-view", err);
      }
    };

    startVideo();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="w-32 h-48 bg-gray-900 rounded-xl overflow-hidden shadow-xl border-2 border-white/50">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
      />
    </div>
  );
};

export default SelfView;