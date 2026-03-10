import { type ReactNode, type DragEvent, useState, useCallback } from 'react'
import NavBar from './NavBar'
import AchievementToast from './AchievementToast'
import { useLiftsContext } from '../lib/LiftsContext'

function DemoBanner({ isDemo }: { isDemo: boolean }) {
  if (!isDemo) return null;
  return (
    <div style={{
      background: 'linear-gradient(90deg, #1a237e, #283593)',
      color: '#e8eaf6',
      textAlign: 'center',
      padding: '8px 16px',
      fontSize: '0.85rem',
    }}>
      Viewing demo dataset — drag and drop your CSV anywhere to analyze your own training
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { isDemo, loadCSV } = useLiftsContext();
  const [dragging, setDragging] = useState(false);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setDragging(false), []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      file.text().then(loadCSV);
    }
  }, [loadCSV]);

  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <NavBar />
      <DemoBanner isDemo={isDemo} />
      {dragging && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(26, 35, 126, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '1.5rem', fontWeight: 600,
        }}>
          Drop CSV to load your training data
        </div>
      )}
      <AchievementToast />
      <main className="page">
        {children}
      </main>
    </div>
  )
}
