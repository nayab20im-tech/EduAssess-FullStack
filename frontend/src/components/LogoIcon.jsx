import { useId } from 'react';

const LogoIcon = ({ size = 32, variant = 'gradient' }) => {
  const gradientId = useId().replace(/:/g, '');
  const isWhite = variant === 'white';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="3" y1="3" x2="29" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6544ED" />
          <stop offset="1" stopColor="#3DA4E9" />
        </linearGradient>
      </defs>

      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="8.5"
        fill={isWhite ? 'rgba(255,255,255,0.12)' : `url(#${gradientId})`}
        stroke={isWhite ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.45)'}
      />
      <path
        d="M9 10.25C9 9.56 9.56 9 10.25 9H21.75C22.44 9 23 9.56 23 10.25V21.75C23 22.44 22.44 23 21.75 23H10.25C9.56 23 9 22.44 9 21.75V10.25Z"
        stroke="white"
        strokeWidth="1.5"
        opacity="0.9"
      />
      <path
        d="M11.75 16.1L14.35 18.65L20.55 12.4"
        stroke="white"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22.8" cy="9.2" r="3.1" fill="#FFD166" stroke={isWhite ? '#FFFFFF' : '#FFF3C4'} strokeWidth="1" />
    </svg>
  );
};

export default LogoIcon;
