import { useState } from 'react';

const SUS_QUESTIONS = [
  "I think I would like to use FinSight frequently.",
  "I found FinSight unnecessarily complex.",
  "I thought FinSight was easy to use.",
  "I think I would need technical support to use FinSight.",
  "The features in FinSight were well integrated.",
  "There was too much inconsistency in FinSight.",
  "Most people would learn FinSight very quickly.",
  "FinSight was very cumbersome to use.",
  "I felt very confident using FinSight.",
  "I needed to learn a lot before using FinSight."
];

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

// SUS score: odd questions positive, even questions negative
function calcSUSScore(answers: number[]): number {
  const oddSum = [0, 2, 4, 6, 8].reduce((a, i) => a + answers[i], 0);
  const evenSum = [1, 3, 5, 7, 9].reduce((a, i) => a + answers[i], 0);
  return Math.round(((oddSum - 5) + (25 - evenSum)) * 2.5);
}

async function sendToTelegram(starRating: number, susAnswers: number[], comment: string) {
  const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;
  const susScore = calcSUSScore(susAnswers);

  const message = [
    `⭐ New FinSight Review`,
    ``,
    `Overall rating: ${starRating}/5 ${'★'.repeat(starRating)}`,
    `SUS Score: ${susScore}/100`,
    ``,
    `SUS Answers:`,
    ...SUS_QUESTIONS.map((q, i) => `${i + 1}. ${q.substring(0, 40)}... → ${susAnswers[i]}/5`),
    ``,
    `Comment: ${comment || '(none)'}`,
  ].join('\n');

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: message }),
  });

  return susScore;
}

interface ReviewSheetProps {
  open: boolean;
  onClose: () => void;
}

type Phase = 'stars' | 'sus' | 'comment' | 'success';

export default function ReviewSheet({ open, onClose }: ReviewSheetProps) {
  const [phase, setPhase] = useState<Phase>('stars');
  const [starVal, setStarVal] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [susStep, setSusStep] = useState(0);
  const [susAnswers, setSusAnswers] = useState<number[]>(Array(10).fill(0));
  const [comment, setComment] = useState('');
  const [susScore, setSusScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const progress =
    phase === 'stars' ? 8 :
    phase === 'sus' ? Math.round(((susStep + 1) / 12) * 85) + 8 :
    phase === 'comment' ? 92 : 100;

  function reset() {
    setPhase('stars'); setStarVal(0); setHoveredStar(0);
    setSusStep(0); setSusAnswers(Array(10).fill(0));
    setComment(''); setSusScore(0);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const score = await sendToTelegram(starVal, susAnswers, comment);
      setSusScore(score);
      setPhase('success');
    } catch {
      // still show success even if Telegram fails
      setSusScore(calcSUSScore(susAnswers));
      setPhase('success');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    onClose();
    setTimeout(reset, 300);
  }

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 1000, animation: 'fadeIn .2s ease',
      }}
    >
      <div style={{
        background: 'var(--card-bg, #fff)', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: '480px', paddingBottom: '32px',
        maxHeight: '90vh', overflowY: 'auto',
        animation: 'slideUp .28s cubic-bezier(.32,1,.58,1)',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 4, margin: '10px auto 0' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
          <span style={{ fontSize: 17, fontWeight: 500 }}>Rate FinSight</span>
          <button
            onClick={handleClose}
            style={{ width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <i className="ti ti-x" style={{ fontSize: 15 }} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: '#f1f5f9', margin: '14px 20px 0', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#7c3aed', borderRadius: 2, transition: 'width .3s' }} />
        </div>

        <div style={{ padding: 20 }}>

          {/* PHASE: Stars */}
          {phase === 'stars' && (
            <>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Overall experience</p>
              <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 24 }}>How would you rate FinSight overall?</p>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map(v => (
                  <span
                    key={v}
                    onClick={() => setStarVal(v)}
                    onMouseEnter={() => setHoveredStar(v)}
                    onMouseLeave={() => setHoveredStar(0)}
                    style={{
                      fontSize: 44, cursor: 'pointer', transition: 'transform .12s',
                      color: v <= (hoveredStar || starVal) ? '#F59E0B' : '#e2e8f0',
                      transform: v <= (hoveredStar || starVal) ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >★</span>
                ))}
              </div>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginBottom: 24, minHeight: 20 }}>
                {starVal ? STAR_LABELS[starVal] : 'Tap to rate'}
              </p>
              <button
                onClick={() => setPhase('sus')}
                disabled={starVal === 0}
                style={{
                  width: '100%', padding: 13, background: '#7c3aed', color: '#fff',
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                  cursor: starVal ? 'pointer' : 'not-allowed', opacity: starVal ? 1 : 0.4,
                }}
              >Continue</button>
            </>
          )}

          {/* PHASE: SUS questions */}
          {phase === 'sus' && (
            <>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Question {susStep + 1} of 10</p>
              <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 20, lineHeight: 1.4 }}>
                {SUS_QUESTIONS[susStep]}
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    onClick={() => {
                      const next = [...susAnswers];
                      next[susStep] = v;
                      setSusAnswers(next);
                    }}
                    style={{
                      flex: 1, padding: '10px 4px', borderRadius: 8,
                      border: `0.5px solid ${susAnswers[susStep] === v ? '#7c3aed' : '#e2e8f0'}`,
                      background: susAnswers[susStep] === v ? '#7c3aed' : 'transparent',
                      color: susAnswers[susStep] === v ? '#fff' : '#64748b',
                      fontSize: 15, fontWeight: 500, cursor: 'pointer',
                    }}
                  >{v}</button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 24 }}>
                <span>Disagree</span><span>Agree</span>
              </div>
              <button
                onClick={() => {
                  if (susStep < 9) setSusStep(s => s + 1);
                  else setPhase('comment');
                }}
                disabled={susAnswers[susStep] === 0}
                style={{
                  width: '100%', padding: 13, background: '#7c3aed', color: '#fff',
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                  cursor: susAnswers[susStep] ? 'pointer' : 'not-allowed',
                  opacity: susAnswers[susStep] ? 1 : 0.4,
                }}
              >Continue</button>
            </>
          )}

          {/* PHASE: Comment */}
          {phase === 'comment' && (
            <>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Almost done</p>
              <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Any other thoughts? (optional)</p>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="What would make FinSight better for you?"
                style={{
                  width: '100%', border: '0.5px solid #e2e8f0', borderRadius: 8,
                  padding: '10px 12px', fontSize: 14, resize: 'none', height: 90,
                  marginBottom: 20, fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: '100%', padding: 13, background: '#7c3aed', color: '#fff',
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer',
                }}
              >{submitting ? 'Sending...' : 'Submit review'}</button>
              <button
                onClick={handleSubmit}
                style={{
                  width: '100%', padding: 11, background: 'transparent', color: '#64748b',
                  border: '0.5px solid #e2e8f0', borderRadius: 12, fontSize: 14,
                  cursor: 'pointer', marginTop: 8,
                }}
              >Skip</button>
            </>
          )}

          {/* PHASE: Success */}
          {phase === 'success' && (
            <div style={{ textAlign: 'center', paddingTop: 12 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#E1F5EE',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <i className="ti ti-check" style={{ color: '#0F6E56', fontSize: 28 }} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>JazakAllah Khair!</p>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>
                Your feedback has been sent. It helps make FinSight better for everyone.
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#EEEDFE', color: '#534AB7',
                padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, marginBottom: 24,
              }}>
                <i className="ti ti-chart-bar" /> SUS score: {susScore}/100
              </div>
              <br />
              <button
                onClick={handleClose}
                style={{
                  width: '100%', padding: 13, background: '#7c3aed', color: '#fff',
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer',
                }}
              >Done</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(60px) } to { transform: translateY(0) } }
      `}</style>
    </div>
  );
}