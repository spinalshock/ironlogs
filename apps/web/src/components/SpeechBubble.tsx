interface Props {
  visible: boolean;
  text: string;
  typing: boolean;
}

export default function SpeechBubble({ visible, text, typing }: Props) {
  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: '60%',
      marginBottom: 10,
      whiteSpace: 'nowrap',
      padding: '7px 14px',
      borderRadius: 10,
      background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.15), rgba(171, 71, 188, 0.12))',
      border: '1px solid rgba(121, 134, 203, 0.3)',
      boxShadow: '0 0 20px rgba(108, 99, 255, 0.15), 0 4px 16px rgba(0,0,0,0.4)',
      fontSize: '0.75rem',
      lineHeight: 1.4,
      color: '#c4b5fd',
      textShadow: '0 0 8px rgba(167, 139, 250, 0.6)',
      fontWeight: 500,
      letterSpacing: '0.01em',
      animation: 'bubbleFadeIn 0.3s ease',
      zIndex: 10,
    }}>
      {text}
      {typing && <span style={{ opacity: 0.6, animation: 'blink 0.6s infinite' }}>|</span>}
      {/* Triangle outer (border) */}
      <div style={{
        position: 'absolute',
        top: 'calc(100% - 1px)',
        left: 24,
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: '8px solid rgba(121, 134, 203, 0.3)',
      }} />
      {/* Triangle inner (fill) */}
      <div style={{
        position: 'absolute',
        top: 'calc(100% - 2.5px)',
        left: 25,
        width: 0,
        height: 0,
        borderLeft: '7px solid transparent',
        borderRight: '7px solid transparent',
        borderTop: '7px solid rgba(40, 36, 70, 0.95)',
      }} />
    </div>
  );
}
