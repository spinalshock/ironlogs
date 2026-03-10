import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiftsContext } from '../lib/LiftsContext';
import { checkAchievements, CATEGORY_INFO } from '../lib/achievements';
import { getUnlockedAchievements, unlockAchievement } from '../lib/storage';

interface ToastItem {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
}

/**
 * Global achievement toast — mounts once in Layout, watches entries for changes,
 * and shows a fixed-position notification when new achievements are earned.
 * Clicking the toast navigates to the Achievements page.
 */
export default function AchievementToast() {
  const { entries, loading } = useLiftsContext();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [visible, setVisible] = useState(false);
  const initializedRef = useRef(false);
  const prevCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // On first load: sync achievements to IndexedDB silently (no toast).
  // On subsequent entry changes: check for new achievements and toast.
  useEffect(() => {
    if (loading || entries.length === 0) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
      prevCountRef.current = entries.length;
      // Silently sync — unlock any achievements earned from CSV data
      syncExisting(entries);
      return;
    }

    // Only check when entry count changes (user logged new sets)
    if (entries.length === prevCountRef.current) return;
    prevCountRef.current = entries.length;
    checkForNew(entries);
  }, [entries, loading]);

  async function syncExisting(allEntries: typeof entries) {
    const unlocked = await getUnlockedAchievements();
    const earned = checkAchievements(allEntries);
    for (const a of earned) {
      if (!unlocked[a.id]) await unlockAchievement(a.id);
    }
  }

  async function checkForNew(allEntries: typeof entries) {
    const unlocked = await getUnlockedAchievements();
    const earned = checkAchievements(allEntries);
    const newOnes: ToastItem[] = [];

    for (const a of earned) {
      if (!unlocked[a.id]) {
        await unlockAchievement(a.id);
        const info = CATEGORY_INFO[a.category as keyof typeof CATEGORY_INFO];
        newOnes.push({
          id: a.id,
          title: a.title,
          description: a.description,
          category: info?.label || a.category,
          color: info?.color || '#ffd54f',
        });
      }
    }

    if (newOnes.length > 0) {
      setToasts(newOnes);
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 10000);
    }
  }

  function handleClick() {
    setVisible(false);
    navigate('/achievements');
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    setVisible(false);
  }

  if (!visible || toasts.length === 0) return null;

  const shown = toasts.slice(0, 3);
  const extra = toasts.length - 3;

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: '1.5rem',
        right: '1.5rem',
        zIndex: 9000,
        cursor: 'pointer',
        animation: 'toastSlideIn 0.4s ease',
      }}
    >
      {/* Confetti particles */}
      <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
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
        padding: '1rem 1.5rem',
        paddingRight: '2.5rem',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #2a1a4e, #1a2a4e)',
        border: '2px solid #f1c40f',
        boxShadow: '0 8px 32px rgba(241, 196, 15, 0.25), 0 0 60px rgba(241, 196, 15, 0.08)',
        minWidth: '300px',
        maxWidth: '400px',
      }}>
        {/* Dismiss X */}
        <div
          onClick={handleDismiss}
          style={{
            position: 'absolute', top: '8px', right: '12px',
            color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem',
            cursor: 'pointer', lineHeight: 1,
          }}
        >
          &times;
        </div>

        <div style={{
          fontSize: '0.7rem', color: '#f1c40f', textTransform: 'uppercase',
          letterSpacing: '0.12em', marginBottom: '0.5rem', fontWeight: 700,
        }}>
          Achievement Unlocked!
        </div>

        {shown.map((t) => (
          <div key={t.id} style={{ marginBottom: '0.4rem' }}>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.04em', color: t.color, marginRight: '0.5rem',
              padding: '1px 6px', borderRadius: '3px',
              border: `1px solid ${t.color}40`, background: `${t.color}15`,
            }}>
              {t.category}
            </span>
            <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
              {t.title}
            </span>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginTop: '1px', marginLeft: '0.25rem' }}>
              {t.description}
            </div>
          </div>
        ))}

        {extra > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>
            +{extra} more unlocked
          </div>
        )}

        <div style={{
          fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)',
          marginTop: '0.5rem', textAlign: 'right',
        }}>
          Click to view →
        </div>
      </div>

      <style>{`
        @keyframes toastSlideIn {
          0% { opacity: 0; transform: translateX(120%); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes confetti-0 { 0% { opacity: 1; transform: translate(0,0) rotate(0deg); } 100% { opacity: 0; transform: translate(-30px,-40px) rotate(180deg); } }
        @keyframes confetti-1 { 0% { opacity: 1; transform: translate(0,0) rotate(0deg); } 100% { opacity: 0; transform: translate(30px,-50px) rotate(-180deg); } }
        @keyframes confetti-2 { 0% { opacity: 1; transform: translate(0,0) rotate(0deg); } 100% { opacity: 0; transform: translate(-20px,-60px) rotate(270deg); } }
        @keyframes confetti-3 { 0% { opacity: 1; transform: translate(0,0) rotate(0deg); } 100% { opacity: 0; transform: translate(40px,-35px) rotate(-270deg); } }
      `}</style>
    </div>
  );
}
