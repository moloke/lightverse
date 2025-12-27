import { ImageResponse } from 'next/og'
 
// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'
 
// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          borderRadius: '37px',
        }}
      >
        <svg
          width="90"
          height="80"
          viewBox="0 0 90 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left page */}
          <path
            d="M 5 10 Q 5 5, 10 5 L 40 5 L 40 70 L 10 70 Q 5 70, 5 65 Z"
            fill="white"
            opacity="0.95"
          />

          {/* Right page */}
          <path
            d="M 50 5 L 80 5 Q 85 5, 85 10 L 85 65 Q 85 70, 80 70 L 50 70 Z"
            fill="white"
            opacity="0.95"
          />

          {/* Center binding */}
          <rect x="43" y="5" width="4" height="65" fill="#4338ca" opacity="0.3" />

          {/* Bookmark ribbon */}
          <path d="M 70 5 L 70 85 L 75 80 L 80 85 L 80 5 Z" fill="#ef4444" />

          {/* Text lines on left page */}
          <line x1="12" y1="15" x2="35" y2="15" stroke="#6366f1" strokeWidth="1.5" opacity="0.4" />
          <line x1="12" y1="22" x2="35" y2="22" stroke="#6366f1" strokeWidth="1.5" opacity="0.4" />
          <line x1="12" y1="29" x2="30" y2="29" stroke="#6366f1" strokeWidth="1.5" opacity="0.4" />

          {/* Text lines on right page */}
          <line x1="55" y1="15" x2="78" y2="15" stroke="#6366f1" strokeWidth="1.5" opacity="0.4" />
          <line x1="55" y1="22" x2="78" y2="22" stroke="#6366f1" strokeWidth="1.5" opacity="0.4" />
          <line x1="55" y1="29" x2="73" y2="29" stroke="#6366f1" strokeWidth="1.5" opacity="0.4" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
