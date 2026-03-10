import { useState, useEffect } from 'react';

interface Props {
  title: string;
  description: string;
  onClose: () => void;
}

export default function AchievementToast({ title, description, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 1000,
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      transition: 'transform 0.3s ease',
    }}>
      {/* Confetti particles */}
      <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50)', pointerEvents: 'none' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} style={{
            position: 'absolute',
            width: '6px', height: '6px',
            borderRadius: i % 2 === 0 ? '50%' : '0',
            backgroundColor: ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'][i % 6],
            animation: `confetti-${i % 4} 1s ease-out forwards`,
            opacity: 0,
          }} />
        ))}
      </div>
      <div style={{
        padding: '1rem 1.5rem', borderRadius: '8px',
        background: 'linear-gradient(135deg, #2a1a4e, #1a2a4e)',
        border: '2px solid #f1c40f', boxShadow: '0 4px 20px rgba(241, 196, 15, 0.3)',
        minWidth: '280px',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#f1c40f', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
          Achievement Unlocked!
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.25rem' }}>{title}</div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{description}</div>
      </div>
      <style>{`
        @keyframes confetti-0 { 0% { opacity: 1; transform: translate(0,0) rotate(0deg); } 100% { opacity: 0; transform: translate(-30px,-40px) rotate(180deg); } }
        @keyframes confetti-1 { 0% { opacity: 1; transform: translate(0,0) rotate(0deg); } 100% { opacity: 0; transform: translate(30px,-50px) rotate(-180deg); } }
        @keyframes confetti-2 { 0% { opacity: 1; transform: translate(0,0) rotate(0deg); } 100% { opacity: 0; transform: translate(-20px,-60px) rotate(270deg); } }
        @keyframes confetti-3 { 0% { opacity: 1; transform: translate(0,0) rotate(0deg); } 100% { opacity: 0; transform: translate(40px,-35px) rotate(-270deg); } }
      `}</style>
    </div>
  );
}
