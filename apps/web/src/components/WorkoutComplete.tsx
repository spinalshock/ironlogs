import { useState, useEffect, useRef } from 'react';

interface WorkoutCompleteProps {
  sets: number;
  xpGained: number;
  xpBefore: number;
  xpAfter: number;
  levelBefore: number;
  levelAfter: number;
  progressBefore: number;
  progressAfter: number;
  streak: number;
  onDismiss: () => void;
}

function getStreakMessage(streak: number): string {
  if (streak >= 14) return 'Two weeks straight. Machine mode.';
  if (streak >= 7) return '7+ days in a row. Unstoppable.';
  if (streak >= 5) return '5 days running. You\'re on fire!';
  if (streak >= 3) return '3-day streak. Building momentum.';
  return 'Every session counts. Keep showing up.';
}

export default function WorkoutComplete({
  sets,
  xpGained,
  levelBefore,
  levelAfter,
  progressBefore,
  progressAfter,
  streak,
  onDismiss,
}: WorkoutCompleteProps) {
  const [entered, setEntered] = useState(false);
  const [barProgress, setBarProgress] = useState(progressBefore);
  const [showXpPop, setShowXpPop] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const didAnimate = useRef(false);

  const didLevelUp = levelAfter > levelBefore;

  useEffect(() => {
    // Entrance
    requestAnimationFrame(() => setEntered(true));

    if (didAnimate.current) return;
    didAnimate.current = true;

    // Animate progress bar after a short delay
    const barTimer = setTimeout(() => {
      setBarProgress(progressAfter);
    }, 400);

    // Pop in XP count
    const xpTimer = setTimeout(() => {
      setShowXpPop(true);
    }, 600);

    // Level up callout
    const levelTimer = setTimeout(() => {
      if (didLevelUp) setShowLevelUp(true);
    }, 1000);

    return () => {
      clearTimeout(barTimer);
      clearTimeout(xpTimer);
      clearTimeout(levelTimer);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: entered ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: '420px',
          width: '90%',
          transform: entered ? 'scale(1)' : 'scale(0.85)',
          opacity: entered ? 1 : 0,
          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
        }}
      >
        {/* Heading */}
        <div
          style={{
            fontSize: '2.4rem',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '0.25rem',
            letterSpacing: '-0.02em',
          }}
        >
          Workout Complete!
        </div>
        <div
          style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.5)',
            marginBottom: '2rem',
          }}
        >
          {sets} set{sets !== 1 ? 's' : ''} logged
        </div>

        {/* XP Gained */}
        <div
          style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            color: '#f1c40f',
            marginBottom: '1.25rem',
            transform: showXpPop ? 'scale(1)' : 'scale(0)',
            opacity: showXpPop ? 1 : 0,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          }}
        >
          +{xpGained} XP
        </div>

        {/* Level indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#7986cb',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Level {didLevelUp ? levelAfter : levelBefore}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.4)',
            }}
          >
            {Math.round(barProgress * 100)}%
          </span>
        </div>

        {/* XP Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '14px',
            borderRadius: '7px',
            background: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${barProgress * 100}%`,
              borderRadius: '7px',
              background: 'linear-gradient(90deg, #7986cb, #9fa8da)',
              transition: 'width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              boxShadow: '0 0 12px rgba(121, 134, 203, 0.4)',
            }}
          />
        </div>

        {/* Level Up callout */}
        {didLevelUp && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(241, 196, 15, 0.15), rgba(241, 196, 15, 0.05))',
              border: '1px solid rgba(241, 196, 15, 0.3)',
              transform: showLevelUp ? 'scale(1)' : 'scale(0.8)',
              opacity: showLevelUp ? 1 : 0,
              transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
            }}
          >
            <div
              style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                color: '#f1c40f',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              LEVEL UP!
            </div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.2rem' }}>
              Level {levelBefore} &rarr; Level {levelAfter}
            </div>
          </div>
        )}

        {/* Streak */}
        <div
          style={{
            marginBottom: '2rem',
            padding: '1rem',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.04)',
          }}
        >
          {streak > 0 && (
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#fff',
                marginBottom: '0.35rem',
              }}
            >
              {streak} day{streak !== 1 ? 's' : ''} streak
            </div>
          )}
          <div
            style={{
              fontSize: '0.9rem',
              color: 'rgba(255, 255, 255, 0.55)',
              fontStyle: 'italic',
            }}
          >
            {getStreakMessage(streak)}
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={onDismiss}
          style={{
            padding: '0.85rem 2.5rem',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#fff',
            background: '#7986cb',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            letterSpacing: '0.03em',
            transition: 'background 0.2s ease, transform 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#9fa8da';
            e.currentTarget.style.transform = 'scale(1.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#7986cb';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
