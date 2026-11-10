import React from 'react';

export const AudioWaveform = ({ isRecording = false, isSpeaking = false, size = 'md' }) => {
  const bars = [16, 28, 42, 20, 36, 48, 24, 32, 18, 40, 22, 34];

  if (!isRecording && !isSpeaking) {
    return null;
  }

  const heightClass = size === 'sm' ? 'h-6' : size === 'lg' ? 'h-16' : 'h-10';
  const barWidth = size === 'sm' ? 'w-1' : size === 'lg' ? 'w-2' : 'w-1.5';
  const color = isRecording ? 'bg-red-500' : 'bg-primary';

  return (
    <div className={`flex items-center justify-center gap-1.5 ${heightClass} py-1`}>
      {bars.map((height, idx) => (
        <span
          key={idx}
          className={`${barWidth} rounded-full ${color} transition-all duration-150`}
          style={{
            height: `${height * (size === 'sm' ? 0.5 : 1)}%`,
            animation: `wave 0.8s ease-in-out infinite alternate`,
            animationDelay: `${idx * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
};
