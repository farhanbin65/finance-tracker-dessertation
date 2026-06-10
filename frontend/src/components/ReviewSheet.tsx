import { useState } from 'react'

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
]

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

function calcSUSScore(answers: number[]): number {
  const oddSum  = [0, 2, 4, 6, 8].reduce((a, i) => a + answers[i], 0)
  const evenSum = [1, 3, 5, 7, 9].reduce((a, i) => a + answers[i], 0)
  return Math.round(((oddSum - 5) + (25 - evenSum)) * 2.5)
}

async function sendToTelegram(
  name: string,
  starRating: number,
  susAnswers: number[],
  comment: string
) {
  const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN
  const CHAT_ID   = import.meta.env.VITE_TELEGRAM_CHAT_ID
  const susScore  = calcSUSScore(susAnswers)

  const message = [
    `New FinSight Review`,
    ``,
    `Tester: ${name}`,
    `Overall rating: ${starRating}/5 ${'★'.repeat(starRating)}`,
    `SUS Score: ${susScore}/100`,
    ``,
    `SUS Answers:`,
    ...SUS_QUESTIONS.map((q, i) =>
      `${i + 1}. ${q.substring(0, 45)}... → ${susAnswers[i]}/5`
    ),
    ``,
    `Comment: ${comment || '(none)'}`,
  ].join('\n')

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: CHAT_ID, text: message }),
  })

  return susScore
}

type Phase = 'stars' | 'sus' | 'name' | 'comment' | 'success'

interface ReviewSheetProps {
  open:    boolean
  onClose: () => void
}

export default function ReviewSheet({ open, onClose }: ReviewSheetProps) {
  const [phase,       setPhase]       = useState<Phase>('stars')
  const [starVal,     setStarVal]     = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [susStep,     setSusStep]     = useState(0)
  const [susAnswers,  setSusAnswers]  = useState<number[]>(Array(10).fill(0))
  const [testerName,  setTesterName]  = useState('')
  const [comment,     setComment]     = useState('')
  const [susScore,    setSusScore]    = useState(0)
  const [submitting,  setSubmitting]  = useState(false)

  const progress =
    phase === 'stars'   ? 8  :
    phase === 'sus'     ? Math.round(((susStep + 1) / 12) * 80) + 8 :
    phase === 'name'    ? 90 :
    phase === 'comment' ? 95 : 100

  function reset() {
    setPhase('stars')
    setStarVal(0)
    setHoveredStar(0)
    setSusStep(0)
    setSusAnswers(Array(10).fill(0))
    setTesterName('')
    setComment('')
    setSusScore(0)
  }

  // ── Auto-advance when SUS number tapped ──────────────────────
  function handleSUSAnswer(qi: number, v: number) {
    const next = [...susAnswers]
    next[qi] = v
    setSusAnswers(next)

    // slight delay so user sees the selection highlight before moving on
    setTimeout(() => {
      if (qi < 9) setSusStep(s => s + 1)
      else        setPhase('name')
    }, 280)
  }

  // ── Auto-advance when star tapped ────────────────────────────
  function handleStarTap(v: number) {
    setStarVal(v)
    setTimeout(() => setPhase('sus'), 320)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const score = await sendToTelegram(testerName || 'Anonymous', starVal, susAnswers, comment)
      setSusScore(score)
    } catch {
      setSusScore(calcSUSScore(susAnswers))
    } finally {
      setSubmitting(false)
      setPhase('success')
    }
  }

  function handleClose() {
    onClose()
    setTimeout(reset, 300)
  }

  if (!open) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{
        background:    'var(--bg-secondary, #fff)',
        borderRadius:  '20px 20px 0 0',
        width:         '100%',
        maxWidth:      '480px',
        paddingBottom: '40px',
        maxHeight:     '90vh',
        overflowY:     'auto',
        animation:     'slideUp .28s cubic-bezier(.32,1,.58,1)',
      }}>

        {/* Handle */}
        <div style={{
          width: 36, height: 4,
          background: 'var(--border)', borderRadius: 4,
          margin: '10px auto 0',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '16px 20px 0',
        }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
            Rate FinSight
          </span>
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--bg-card2)', border: 'none',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 15, color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 3, background: 'var(--border)',
          margin: '14px 20px 0', borderRadius: 2,
        }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: 'var(--accent)', borderRadius: 2,
            transition: 'width .3s',
          }} />
        </div>

        <div style={{ padding: 20 }}>

          {/* ── STARS ─────────────────────────────────────────── */}
          {phase === 'stars' && (
            <>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                Overall experience
              </p>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 28, color: 'var(--text-primary)' }}>
                How would you rate FinSight overall?
              </p>
              <div style={{
                display: 'flex', gap: 8,
                justifyContent: 'center', marginBottom: 10,
              }}>
                {[1, 2, 3, 4, 5].map(v => (
                  <span
                    key={v}
                    onClick={() => handleStarTap(v)}
                    onMouseEnter={() => setHoveredStar(v)}
                    onMouseLeave={() => setHoveredStar(0)}
                    role="button"
                    aria-label={`${v} star${v > 1 ? 's' : ''}`}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && handleStarTap(v)}
                    style={{
                      fontSize:   48,
                      cursor:     'pointer',
                      transition: 'transform .12s',
                      color:      v <= (hoveredStar || starVal) ? '#F59E0B' : 'var(--border)',
                      transform:  v <= (hoveredStar || starVal) ? 'scale(1.15)' : 'scale(1)',
                      userSelect: 'none',
                    }}
                  >★</span>
                ))}
              </div>
              <p style={{
                textAlign: 'center', fontSize: 14,
                color: 'var(--text-muted)', minHeight: 20,
              }}>
                {starVal ? STAR_LABELS[starVal] : 'Tap a star to begin'}
              </p>
            </>
          )}

          {/* ── SUS QUESTIONS ─────────────────────────────────── */}
          {phase === 'sus' && (
            <>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                Question {susStep + 1} of 10
              </p>
              <p style={{
                fontSize: 16, fontWeight: 600, marginBottom: 24,
                lineHeight: 1.4, color: 'var(--text-primary)',
              }}>
                {SUS_QUESTIONS[susStep]}
              </p>

              {/* Number buttons — tap to auto-advance */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    onClick={() => handleSUSAnswer(susStep, v)}
                    style={{
                      flex:         1,
                      height:       52,
                      borderRadius: 12,
                      border:       `1.5px solid ${susAnswers[susStep] === v ? 'var(--accent)' : 'var(--border)'}`,
                      background:   susAnswers[susStep] === v ? 'var(--accent)' : 'var(--bg-card)',
                      color:        susAnswers[susStep] === v ? '#fff' : 'var(--text-secondary)',
                      fontSize:     18,
                      fontWeight:   600,
                      cursor:       'pointer',
                      transition:   'all .15s',
                    }}
                  >{v}</button>
                ))}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11, color: 'var(--text-muted)',
              }}>
                <span>Strongly disagree</span>
                <span>Strongly agree</span>
              </div>
            </>
          )}

          {/* ── NAME ──────────────────────────────────────────── */}
          {phase === 'name' && (
            <>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                Almost done
              </p>
              <p style={{
                fontSize: 16, fontWeight: 600, marginBottom: 20,
                color: 'var(--text-primary)',
              }}>
                What's your name?
              </p>
              <input
                type="text"
                value={testerName}
                onChange={e => setTesterName(e.target.value)}
                placeholder="e.g. Sarah"
                autoFocus
                style={{
                  width:        '100%',
                  height:       48,
                  border:       '1.5px solid var(--border)',
                  borderRadius: 12,
                  padding:      '0 14px',
                  fontSize:     15,
                  color:        'var(--text-primary)',
                  background:   'var(--bg-card)',
                  marginBottom: 20,
                  fontFamily:   'inherit',
                  outline:      'none',
                }}
                onKeyDown={e => e.key === 'Enter' && setPhase('comment')}
              />
              <button
                onClick={() => setPhase('comment')}
                style={{
                  width:        '100%',
                  padding:      13,
                  background:   'var(--accent)',
                  color:        '#fff',
                  border:       'none',
                  borderRadius: 12,
                  fontSize:     15,
                  fontWeight:   600,
                  cursor:       'pointer',
                }}
              >Continue</button>
              <button
                onClick={() => { setTesterName('Anonymous'); setPhase('comment') }}
                style={{
                  width:        '100%',
                  padding:      11,
                  background:   'transparent',
                  color:        'var(--text-muted)',
                  border:       '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize:     14,
                  cursor:       'pointer',
                  marginTop:    8,
                }}
              >Skip</button>
            </>
          )}

          {/* ── COMMENT ───────────────────────────────────────── */}
          {phase === 'comment' && (
            <>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                Final step
              </p>
              <p style={{
                fontSize: 16, fontWeight: 600, marginBottom: 16,
                color: 'var(--text-primary)',
              }}>
                Any other thoughts?
              </p>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="What would make FinSight better for you?"
                style={{
                  width:        '100%',
                  border:       '1.5px solid var(--border)',
                  borderRadius: 12,
                  padding:      '10px 14px',
                  fontSize:     14,
                  resize:       'none',
                  height:       90,
                  marginBottom: 20,
                  fontFamily:   'inherit',
                  color:        'var(--text-primary)',
                  background:   'var(--bg-card)',
                  outline:      'none',
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width:        '100%',
                  padding:      13,
                  background:   'var(--accent)',
                  color:        '#fff',
                  border:       'none',
                  borderRadius: 12,
                  fontSize:     15,
                  fontWeight:   600,
                  cursor:       'pointer',
                  opacity:      submitting ? 0.6 : 1,
                }}
              >{submitting ? 'Sending...' : 'Submit review'}</button>
              <button
                onClick={handleSubmit}
                style={{
                  width:        '100%',
                  padding:      11,
                  background:   'transparent',
                  color:        'var(--text-muted)',
                  border:       '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize:     14,
                  cursor:       'pointer',
                  marginTop:    8,
                }}
              >Skip</button>
            </>
          )}

          {/* ── SUCCESS ───────────────────────────────────────── */}
          {phase === 'success' && (
            <div style={{ textAlign: 'center', paddingTop: 12 }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'rgba(34,197,94,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <i className="ti ti-check"
                   style={{ color: 'var(--green)', fontSize: 30 }} />
              </div>
              <p style={{
                fontSize: 18, fontWeight: 700,
                color: 'var(--text-primary)', marginBottom: 8,
              }}>
                JazakAllah Khair!
              </p>
              <p style={{
                fontSize: 14, color: 'var(--text-muted)',
                lineHeight: 1.5, marginBottom: 20,
              }}>
                Your feedback has been sent. It helps make FinSight better for everyone.
              </p>
              <div style={{
                display:      'inline-flex',
                alignItems:   'center',
                gap:          6,
                background:   'var(--accent-light)',
                color:        'var(--accent)',
                padding:      '6px 18px',
                borderRadius: 20,
                fontSize:     13,
                fontWeight:   600,
                marginBottom: 24,
              }}>
                <i className="ti ti-chart-bar" />
                SUS score: {susScore}/100
              </div>
              <br />
              <button
                onClick={handleClose}
                style={{
                  width:        '100%',
                  padding:      13,
                  background:   'var(--accent)',
                  color:        '#fff',
                  border:       'none',
                  borderRadius: 12,
                  fontSize:     15,
                  fontWeight:   600,
                  cursor:       'pointer',
                }}
              >Done</button>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(60px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
      `}</style>
    </div>
  )
}