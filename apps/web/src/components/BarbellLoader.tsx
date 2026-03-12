import ReactDOM from 'react-dom';

const style = document.createElement('style');
style.textContent = `
@keyframes barbell-bounce {
  0% {
    transform: scaleX(1.3) scaleY(0.8);
    animation-timing-function: cubic-bezier(0.3, 0, 0.1, 1);
  }
  15% {
    transform: scaleX(0.75) scaleY(1.25);
    animation-timing-function: cubic-bezier(0, 0, 0.7, 0.75);
  }
  55% {
    transform: scaleX(1.05) scaleY(0.95);
    animation-timing-function: cubic-bezier(0.9, 0, 1, 1);
  }
  95% {
    transform: scaleX(0.75) scaleY(1.25);
    animation-timing-function: cubic-bezier(0, 0, 0, 1);
  }
  100% {
    transform: scaleX(1.3) scaleY(0.8);
    animation-timing-function: cubic-bezier(0, 0, 0.7, 1);
  }
}
`;
if (!document.querySelector('[data-barbell-loader]')) {
  style.setAttribute('data-barbell-loader', '');
  document.head.appendChild(style);
}

function Barbell({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={{ animation: 'barbell-bounce 0.8s infinite' }}
    >
      <rect x="8" y="20" width="8" height="24" rx="2" fill="#6c63ff"/>
      <rect x="48" y="20" width="8" height="24" rx="2" fill="#6c63ff"/>
      <rect x="2" y="24" width="8" height="16" rx="2" fill="#8b83ff"/>
      <rect x="54" y="24" width="8" height="16" rx="2" fill="#8b83ff"/>
      <rect x="16" y="29" width="32" height="6" rx="2" fill="#a78bfa"/>
    </svg>
  );
}

export default function BarbellLoader({ size = 56 }: { size?: number }) {
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: 'rgba(10, 10, 20, 0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Barbell size={size} />
      <span className="text-sm opacity-40">Loading...</span>
    </div>,
    document.body,
  );
}
