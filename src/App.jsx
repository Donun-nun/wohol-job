import { useState, useEffect, useRef, createContext, useContext, lazy, Suspense } from 'react'
import { useJobs } from './useJobs'
import { useQuestions } from './useQuestions'
import { useCampReviews } from './useCampReviews'
import { useAccess, fetchPendingPayslips, approvePayslip, rejectPayslip } from './useAccess'
import { supabase } from './supabase'

// ─── Themes ──────────────────────────────────────────────────────────────────
const lightC = {
  dark:'#2C1A00', accent:'#C8963C', gold:'#FFD580',
  sub:'#8A7060', border:'#E8E2D8', bg:'#FAF7F2', card:'#ffffff', fill:'#F5F0E8',
}
const darkC = {
  dark:'#F0E8D8', accent:'#C8963C', gold:'#FFD580',
  sub:'#9A8070', border:'#3D2E22', bg:'#1A1210', card:'#2A1E15', fill:'#231915',
}
const ThemeCtx = createContext(lightC)
const useC = () => useContext(ThemeCtx)

const LazyMapView = lazy(() =>
  import('./MapView').catch(() => ({
    default: () => (
      <div style={{ height:360, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Noto Sans KR', fontSize:13, color:'#8A7060' }}>
        Map load failed. Run <code style={{ margin:'0 6px' }}>npm install react-leaflet leaflet</code> in terminal and restart.
      </div>
    ),
  }))
)
const LazyCampMapView = lazy(() =>
  import('./CampMapView').catch(() => ({ default: () => null }))
)

// ─── Badge 계산 ───────────────────────────────────────────────────────────────
function getAuthorBadges(author, authorStats) {
  const s = authorStats?.[author]
  if (!s) return []
  const badges = []
  if (s.count >= 5) badges.push({ emoji: '🏆', label: 'Veteran (5+ reviews)' })
  else if (s.count >= 3) badges.push({ emoji: '⭐', label: 'Experienced (3+ reviews)' })
  if (s.hasPhoto) badges.push({ emoji: '📸', label: 'Photo reviewer' })
  if (s.totalLikes >= 10) badges.push({ emoji: '🔥', label: 'Popular writer' })
  return badges
}

// ─── SurveyModal ─────────────────────────────────────────────────────────────
function SurveyModal({ user, onDone }) {
  const C = useC()
  const [stage, setStage] = useState('')
  const [jobsTried, setJobsTried] = useState(null)
  const [goal, setGoal] = useState('')
  const [goalOther, setGoalOther] = useState('')
  const [saving, setSaving] = useState(false)

  const WHV_STAGES = ['입국 전', '1년차', '2년차', '3년차', '그 이상']
  const GOALS = ['특정 지역/회사 후기 찾기', '시급 정보 비교', '세컨비자 가능한 일자리', 'FIFO / 광산 취업 정보', '인터뷰 팁 / 취업 준비', '기타']

  const canSubmit = stage && jobsTried !== null && goal && (goal !== '기타' || goalOther.trim())

  const handleSave = async () => {
    if (!canSubmit) return
    setSaving(true)
    await supabase.from('profiles').update({
      whv_stage: stage,
      jobs_tried: jobsTried,
      main_goal: goal === '기타' ? `기타: ${goalOther.trim()}` : goal,
      survey_done: true,
    }).eq('id', user.id)
    setSaving(false)
    onDone()
  }

  const optBtn = (label, selected, onClick) => (
    <button key={label} onClick={onClick}
      style={{ padding:'8px 14px', borderRadius:20, cursor:'pointer', fontSize:13, fontFamily:'Noto Sans KR', border:`1.5px solid ${selected ? C.dark : C.border}`, background: selected ? C.dark : 'transparent', color: selected ? C.gold : C.sub, transition:'all 0.15s' }}>
      {label}
    </button>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:150, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:28, width:'100%', maxWidth:420, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize:32, textAlign:'center', marginBottom:10 }}>🦘</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:18, fontWeight:700, color:C.dark, marginBottom:4, textAlign:'center' }}>빠르게 3가지만 알려주세요</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:12, color:C.sub, textAlign:'center', marginBottom:24 }}>더 나은 서비스를 위해 활용해요</div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:13, fontWeight:700, color:C.dark, marginBottom:10 }}>1. 호주 워홀 어느 단계예요?</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {WHV_STAGES.map(s => optBtn(s, stage === s, () => setStage(s)))}
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:13, fontWeight:700, color:C.dark, marginBottom:10 }}>2. 호주에서 몇 가지 일을 해봤어요?</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[0,1,2,3,4,'5개 이상'].map(n => optBtn(String(n), jobsTried === n, () => setJobsTried(n)))}
          </div>
        </div>

        <div style={{ marginBottom:24 }}>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:13, fontWeight:700, color:C.dark, marginBottom:10 }}>3. 이 사이트에서 가장 원하는 게 뭐예요?</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {GOALS.map(g => optBtn(g, goal === g, () => { setGoal(g); if (g !== '기타') setGoalOther('') }))}
          </div>
          {goal === '기타' && (
            <input value={goalOther} onChange={e => setGoalOther(e.target.value)}
              placeholder="직접 입력해주세요" maxLength={50} autoFocus
              style={{ marginTop:10, width:'100%', background:C.fill, border:`1.5px solid ${C.border}`, borderRadius:8, padding:'10px 12px', color:C.dark, fontSize:13, fontFamily:'Noto Sans KR', outline:'none', boxSizing:'border-box' }} />
          )}
        </div>

        <button onClick={handleSave} disabled={!canSubmit || saving}
          style={{ width:'100%', background: canSubmit ? C.dark : C.border, color: canSubmit ? C.gold : C.sub, border:'none', borderRadius:10, padding:'13px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor: canSubmit ? 'pointer' : 'default', transition:'all 0.2s' }}>
          {saving ? '저장 중...' : '완료 — 후기 보러 가기 →'}
        </button>
      </div>
    </div>
  )
}

// ─── NicknameModal ────────────────────────────────────────────────────────────
function NicknameModal({ user, onSave, onClose, isEdit, currentNickname }) {
  const C = useC()
  const [nickname, setNickname] = useState(isEdit ? (currentNickname || '') : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const trimmed = nickname.trim()
    if (!trimmed) { setError('Please enter a nickname.'); return }
    if (trimmed.length < 2) { setError('At least 2 characters required.'); return }
    if (trimmed.length > 20) { setError('Maximum 20 characters.'); return }
    setSaving(true)
    const { error: err } = isEdit
      ? await supabase.from('profiles').update({ nickname: trimmed }).eq('id', user.id)
      : await supabase.from('profiles').insert({ id: user.id, nickname: trimmed })
    if (err) {
      setError(err.code === '23505' ? 'Nickname already taken.' : 'Save failed. Please try again.')
      setSaving(false)
    } else { onSave(trimmed) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:150, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:36, width:'100%', maxWidth:380, textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize:36, marginBottom:14 }}>👤</div>
        <div style={{ fontFamily:"'Noto Sans KR'", fontSize:20, fontWeight:700, color:C.dark, marginBottom:8 }}>{isEdit ? 'Edit nickname' : 'Set your nickname'}</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.sub, marginBottom:24, lineHeight:1.7 }}>
          This nickname will appear on all your posts.<br />Changes apply to existing posts too.
        </div>
        <input value={nickname} onChange={e => { setNickname(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="e.g. Perth WHV, Mining King, Kenny" maxLength={20}
          style={{ width:'100%', background:C.fill, border:`1.5px solid ${error ? '#E05050' : C.border}`, borderRadius:8, padding:'11px 14px', color:C.dark, fontSize:14, fontFamily:'Noto Sans KR', outline:'none', boxSizing:'border-box', marginBottom:6 }} />
        {error && <div style={{ fontSize:12, color:'#E05050', fontFamily:'Noto Sans KR', marginBottom:10 }}>{error}</div>}
        <button onClick={handleSave} disabled={saving}
          style={{ width:'100%', background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'13px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, marginTop:8 }}>
          {saving ? 'Saving...' : (isEdit ? 'Update nickname' : 'Save nickname')}
        </button>
        {isEdit && onClose && (
          <button onClick={onClose} style={{ marginTop:10, width:'100%', background:'transparent', color:C.sub, border:'none', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer' }}>Cancel</button>
        )}
      </div>
    </div>
  )
}

// ─── LoginPromptModal ─────────────────────────────────────────────────────────
function LoginPromptModal({ onClose, onLogin }) {
  const C = useC()
  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:36, width:'100%', maxWidth:360, textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize:36, marginBottom:14 }}>🔐</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:20, fontWeight:700, color:C.dark, marginBottom:8 }}>로그인이 필요해요</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:C.sub, lineHeight:1.7, marginBottom:28 }}>후기 내용을 보려면 구글 로그인이 필요해요.<br /><span style={{ fontSize:12 }}>간단한 설문 3가지만 답하면 바로 볼 수 있어요 👍</span></div>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
          <GoogleSignInBtn width={288} />
        </div>
        <button onClick={onClose} style={{ width:'100%', background:'transparent', color:C.sub, border:'none', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

// ─── GoogleSignInBtn ──────────────────────────────────────────────────────────
function GoogleSignInBtn({ width = 260 }) {
  const ref = useRef(null)
  useEffect(() => {
    let timer
    let alive = true
    const init = async () => {
      if (!window.google?.accounts?.id || !ref.current) { timer = setTimeout(init, 200); return }
      if (!alive) return
      const rawNonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
      const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce))
      const hashedNonce = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('')
      if (!alive || !ref.current) return
      window.google.accounts.id.initialize({
        client_id: '596937966421-53mo6kdqs67n080ghjg8s2df1c80ve6t.apps.googleusercontent.com',
        nonce: hashedNonce,
        callback: async ({ credential }) => {
          if (!credential) return
          try {
            const res = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=id_token`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_KEY },
                body: JSON.stringify({ provider: 'google', id_token: credential, nonce: rawNonce }),
              }
            )
            const json = await res.json()
            if (!res.ok) { alert('Login error: ' + (json.error_description || json.msg || json.message || JSON.stringify(json))); return }
            if (json.access_token) await supabase.auth.setSession({ access_token: json.access_token, refresh_token: json.refresh_token })
          } catch (e) { alert('Network error: ' + e.message) }
        },
      })
      window.google.accounts.id.renderButton(ref.current, {
        type: 'standard', theme: 'outline', size: 'large',
        text: 'signin_with', shape: 'rectangular', width: String(width),
      })
    }
    init()
    return () => { alive = false; clearTimeout(timer) }
  }, [])
  return <div ref={ref} />
}

// ─── Constants ────────────────────────────────────────────────────────────────
const REGIONS = ["All", "WA", "NSW", "VIC", "QLD", "SA", "NT", "TAS", "ACT"]
const TYPES   = ["All", "Casual", "Part-time", "Full-time"]
const TAGS    = ['Mining','Cafe','Farm','Kitchen','Construction','Service','Logistics','Other']
const ENG_LABELS = { 하:'Low', 중:'Med', 상:'High' }
const EMPTY_FORM = { title:'', company:'', region:'WA', location:'', type:'Casual', hourly:'', shift:'', review:'', pros:'', cons:'', daily_life:'', interview_tips:'', stars:4, author:'', tags:[], second_visa:null, english_level:'' }

const CLOUDINARY_CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const TG_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN
const TG_CHAT  = import.meta.env.VITE_TELEGRAM_CHAT_ID

async function notifyAdmin(text) {
  if (!TG_TOKEN || !TG_CHAT) return
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' }),
    })
  } catch {}
}

// 지역별 오픈채팅 링크 — 실제 링크 추가 시 여기에 입력
const OPENCHAT_LINKS = {
  WA: '', QLD: '', NSW: '', VIC: '', SA: '', NT: '', TAS: '', ACT: '',
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff/86400)}d ago`
  return `${Math.floor(diff/2592000)}mo ago`
}

async function translateToEn(text) {
  if (!text?.trim()) return text
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=ko|en`
  )
  const json = await res.json()
  return json.responseData?.translatedText || text
}

function TranslateButton({ fields }) {
  const C = useC()
  const [translated, setTranslated] = useState(null)
  const [loading, setLoading] = useState(false)
  const handle = async (e) => {
    e.stopPropagation()
    if (translated) { setTranslated(null); return }
    setLoading(true)
    const combined = fields.filter(Boolean).join('\n\n')
    const result = await translateToEn(combined)
    setTranslated(result)
    setLoading(false)
  }
  return (
    <div style={{ marginTop:8 }}>
      <button onClick={handle} style={{ fontSize:11, color:C.sub, background:'transparent', border:`1px solid ${C.border}`, borderRadius:6, padding:'3px 8px', cursor:'pointer', fontFamily:'sans-serif' }}>
        {loading ? '...' : translated ? '✕ Hide translation' : '🌐 Translate'}
      </button>
      {translated && (
        <div style={{ marginTop:6, padding:'10px 12px', background:C.fill, borderRadius:8, fontSize:12, color:C.dark, lineHeight:1.7, fontFamily:'sans-serif', whiteSpace:'pre-wrap' }}>
          {translated}
        </div>
      )}
    </div>
  )
}

async function uploadPhoto(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method:'POST', body:formData })
  return (await res.json()).secure_url
}

// ─── AdminPanel ───────────────────────────────────────────────────────────────
function AdminPanel({ onClose }) {
  const C = useC()
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const data = await fetchPendingPayslips()
    setPayslips(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const approve = async (id, userId) => {
    await approvePayslip(id, userId)
    setPayslips(prev => prev.filter(p => p.id !== id))
  }

  const reject = async (id) => {
    await rejectPayslip(id)
    setPayslips(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:150, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:28, width:'100%', maxWidth:520, maxHeight:'80vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:18, fontWeight:700, color:C.dark }}>🛡 Admin — Payslip Review</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:C.sub }}>✕</button>
        </div>
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:C.sub, fontFamily:'Noto Sans KR', fontSize:13 }}>Loading...</div>
        ) : payslips.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:C.sub, fontFamily:'Noto Sans KR', fontSize:13 }}>No pending payslips 🎉</div>
        ) : payslips.map(p => (
          <div key={p.id} style={{ border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:12 }}>
            <div style={{ fontFamily:'Noto Sans KR', fontSize:13, fontWeight:700, color:C.dark, marginBottom:6 }}>{p.nickname} <span style={{ fontWeight:400, color:C.sub, fontSize:11 }}>{timeAgo(p.created_at)}</span></div>
            <a href={p.file_url} target="_blank" rel="noreferrer" style={{ display:'block', marginBottom:12 }}>
              <img src={p.file_url} alt="payslip" style={{ maxWidth:'100%', borderRadius:8, maxHeight:200, objectFit:'cover' }} onError={e => { e.target.style.display='none' }} />
              <span style={{ fontSize:12, color:C.accent, fontFamily:'Noto Sans KR' }}>View file ↗</span>
            </a>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => approve(p.id, p.user_id)} style={{ flex:1, background:'#E8F5E9', color:'#2E7D32', border:'1px solid #A5D6A7', borderRadius:8, padding:'8px', fontFamily:'Noto Sans KR', fontSize:13, fontWeight:700, cursor:'pointer' }}>✅ Approve</button>
              <button onClick={() => reject(p.id)} style={{ flex:1, background:'#FFEBEE', color:'#C62828', border:'1px solid #EF9A9A', borderRadius:8, padding:'8px', fontFamily:'Noto Sans KR', fontSize:13, fontWeight:700, cursor:'pointer' }}>❌ Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stars({ n }) {
  const C = useC()
  return (
    <div style={{ display:'flex', gap:2 }}>
      {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize:13, color: i<=n ? '#F5A623' : C.border }}>★</span>)}
    </div>
  )
}

// ─── PhotoGallery ─────────────────────────────────────────────────────────────
function PhotoGallery({ photos, isOwner, onCaptionSave }) {
  const C = useC()
  const [active, setActive] = useState(null)
  const [editing, setEditing] = useState(false)
  const [captionDraft, setCaptionDraft] = useState('')

  const openPhoto = (i) => { setActive(i); setCaptionDraft(photos[i]?.caption || ''); setEditing(false) }
  const navigate = (dir) => {
    const next = (active + dir + photos.length) % photos.length
    setActive(next); setCaptionDraft(photos[next]?.caption || ''); setEditing(false)
  }
  const saveCaption = (e) => { e.stopPropagation(); onCaptionSave(active, captionDraft); setEditing(false) }

  useEffect(() => {
    if (active !== null) { setCaptionDraft(photos[active]?.caption || ''); setEditing(false) }
  }, [active])

  useEffect(() => {
    if (active === null) return
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  setActive(a => a === null ? null : (a - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') setActive(a => a === null ? null : (a + 1) % photos.length)
      if (e.key === 'Escape')     setActive(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active === null, photos.length])

  if (!photos?.length) return null
  return (
    <>
      <div style={{ display:'flex', gap:8, overflowX:'auto', padding:'0 20px 14px', scrollbarWidth:'none' }}>
        {photos.map((p, i) => (
          <div key={i} onClick={e => { e.stopPropagation(); openPhoto(i) }}
            style={{ flexShrink:0, width: photos.length===1 ? '100%' : 160, borderRadius:10, overflow:'hidden', cursor:'zoom-in', position:'relative', border:`1px solid ${C.border}` }}>
            <img src={p.url} alt={p.caption} style={{ width:'100%', height: photos.length===1 ? 180 : 110, objectFit:'cover', display:'block' }} />
            {p.caption && <div style={{ padding:'4px 8px', fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', background:C.card, lineHeight:1.4 }}>{p.caption}</div>}
          </div>
        ))}
      </div>
      {active !== null && (
        <div onClick={e => { e.stopPropagation(); setActive(null) }}
          style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ position:'relative', maxWidth:600, width:'100%' }}>
            <div style={{ position:'relative', height:'60vh', background:'rgba(0,0,0,0.2)', borderRadius:12, overflow:'hidden' }}
              onTouchStart={e => { if (photos.length > 1) e.currentTarget._tx = e.touches[0].clientX }}
              onTouchEnd={e => { const dx = e.changedTouches[0].clientX - (e.currentTarget._tx ?? 0); if (Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1) }}>
              <img src={photos[active].url} style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }} />
              {photos.length > 1 && (<>
                <button onClick={e => { e.stopPropagation(); navigate(-1) }}
                  style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,0.25)', border:'none', color:'rgba(255,255,255,0.75)', borderRadius:'0 8px 8px 0', width:40, height:64, cursor:'pointer', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,0.5)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,0.25)'}>‹</button>
                <button onClick={e => { e.stopPropagation(); navigate(1) }}
                  style={{ position:'absolute', right:0, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,0.25)', border:'none', color:'rgba(255,255,255,0.75)', borderRadius:'8px 0 0 8px', width:40, height:64, cursor:'pointer', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,0.5)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,0.25)'}>›</button>
                <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.4)', borderRadius:10, padding:'2px 10px', color:'rgba(255,255,255,0.7)', fontSize:11, fontFamily:'Noto Sans KR' }}>{active+1} / {photos.length}</div>
              </>)}
            </div>
            <div style={{ marginTop:12, minHeight:36 }}>
              {editing ? (
                <div style={{ display:'flex', gap:8 }}>
                  <input autoFocus value={captionDraft} onChange={e => setCaptionDraft(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') saveCaption(e); if (e.key==='Escape') setEditing(false) }}
                    maxLength={60} placeholder="사진 설명 입력..."
                    style={{ flex:1, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:8, padding:'7px 11px', color:'#fff', fontSize:13, fontFamily:'Noto Sans KR', outline:'none' }} />
                  <button onClick={saveCaption} style={{ background:C.accent, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer', fontWeight:700 }}>Save</button>
                  <button onClick={e => { e.stopPropagation(); setEditing(false) }} style={{ background:'rgba(255,255,255,0.1)', color:'#ccc', border:'none', borderRadius:8, padding:'7px 10px', fontFamily:'Noto Sans KR', fontSize:12, cursor:'pointer' }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color: photos[active].caption ? '#ddd' : 'rgba(255,255,255,0.35)', fontFamily:'Noto Sans KR', fontSize:13, flex:1 }}>
                    {photos[active].caption || (isOwner ? '+ Add caption' : '')}
                  </span>
                  {isOwner && (
                    <button onClick={e => { e.stopPropagation(); setEditing(true) }}
                      style={{ background:'rgba(255,255,255,0.1)', color:'#ccc', border:'1px solid rgba(255,255,255,0.2)', borderRadius:6, padding:'4px 10px', fontFamily:'Noto Sans KR', fontSize:11, cursor:'pointer' }}>
                      ✏️ Edit
                    </button>
                  )}
                </div>
              )}
            </div>
            <button onClick={e => { e.stopPropagation(); setActive(null) }}
              style={{ position:'absolute', top:-14, right:-14, background:lightC.dark, color:lightC.gold, border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── PhotoUploader ────────────────────────────────────────────────────────────
function PhotoUploader({ photos, setPhotos }) {
  const C = useC()
  const [uploading, setUploading] = useState(false)
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(files.map(f => uploadPhoto(f)))
      setPhotos(prev => [...prev, ...urls.map(url => ({ url, caption: '' }))])
    } catch { alert('Photo upload failed. Please try again.') }
    setUploading(false)
  }
  return (
    <div>
      {photos.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:10 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ position:'relative', flexShrink:0, width:72, height:72 }}>
                <img src={p.url} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8, border:`1px solid ${C.border}` }} />
                <button onClick={() => setPhotos(prev => prev.filter((_,idx) => idx !== i))}
                  style={{ position:'absolute', top:-6, right:-6, background:C.dark, color:C.gold, border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              </div>
              <input value={p.caption}
                onChange={e => setPhotos(prev => prev.map((ph,idx) => idx===i ? { ...ph, caption:e.target.value } : ph))}
                placeholder="Caption" maxLength={60}
                style={{ flex:1, background:C.fill, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 10px', fontSize:12, fontFamily:'Noto Sans KR', color:C.dark, outline:'none', alignSelf:'center' }} />
            </div>
          ))}
        </div>
      )}
      <label style={{ display:'inline-block', cursor:'pointer', background: uploading ? 'rgba(0,0,0,0.03)' : 'rgba(200,150,60,0.07)', border:`1.5px dashed ${C.accent}`, borderRadius:10, padding:'10px 20px', fontFamily:'Noto Sans KR', fontSize:13, color:C.accent }}>
        {uploading ? 'Uploading...' : '📷 Select photos'}
        <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ display:'none' }} disabled={uploading} />
      </label>
      <div style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', marginTop:6 }}>You can select multiple photos</div>
    </div>
  )
}

// ─── SubmitModal ──────────────────────────────────────────────────────────────
function SubmitModal({ onClose, addJob, updateJob, editData, user }) {
  const C = useC()
  const isEdit = !!editData

  const toForm = (data) => data ? {
    title: data.title||'', company: data.company||'', region: data.region||'WA', location: data.location||'',
    type: data.type||'Casual', hourly: data.hourly||'', shift: data.shift||'', review: data.review||'',
    pros: Array.isArray(data.pros) ? data.pros.join('\n') : (data.pros||''),
    cons: Array.isArray(data.cons) ? data.cons.join('\n') : (data.cons||''),
    daily_life: data.daily_life||'', interview_tips: data.interview_tips||'', stars: data.stars||4,
    author: data.author||'', second_visa: data.second_visa??null, english_level: data.english_level||'',
    tags: (() => {
      const raw = data.tag||''
      if (!raw) return []
      if (raw.trim().startsWith('[')) { try { return JSON.parse(raw) } catch {} }
      return [raw]
    })(),
  } : EMPTY_FORM

  const [form, setForm] = useState(() => toForm(editData))
  const [photos, setPhotos] = useState(() => editData?.photos?.length ? editData.photos : [])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inputStyle = { width:'100%', background:C.fill, border:`1.5px solid ${C.border}`, borderRadius:8, padding:'10px 12px', color:C.dark, fontSize:14, fontFamily:'Noto Sans KR', outline:'none', boxSizing:'border-box' }
  const labelStyle = { fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', marginBottom:6, display:'block' }

  const handleSubmit = async () => {
    if (!form.title || !form.hourly || !form.review) { alert('직종, 시급, 한줄 요약은 필수예요!'); return }
    setSubmitting(true)
    const { tags, ...formRest } = form
    const payload = {
      ...formRest, hourly: Number(form.hourly),
      photos: JSON.stringify(photos.map(p => ({ url:p.url, caption:p.caption||'' }))),
      tag: tags.length ? JSON.stringify(tags) : null,
      ...(!isEdit && user ? { user_id: user.id } : {}),
    }
    const success = isEdit ? await updateJob(editData.id, payload) : await addJob(payload)
    if (success && !isEdit && user) {
      const msg = [
        `🆕 <b>새 후기 등록</b>`,
        ``,
        `👤 ${user.email}`,
        `🏢 ${form.title}${form.company ? ` @ ${form.company}` : ''} (${form.region})`,
        `💰 $${form.hourly}/hr`,
        ``,
        `👉 wohol-job.vercel.app`,
      ].join('\n')
      notifyAdmin(msg)
    }
    setSubmitting(false)
    if (success) setDone(true)
    else alert('저장 실패. 다시 시도해주세요.')
  }

  if (done) return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:40, width:'100%', maxWidth:400, textAlign:'center' }}>
        <div style={{ fontSize:44, marginBottom:16 }}>{isEdit ? '✅' : '🎉'}</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:22, fontWeight:700, color:C.dark, marginBottom:8 }}>{isEdit ? '수정 완료!' : '후기 등록 완료!'}</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:C.sub, lineHeight:1.7, marginBottom:24 }}>{isEdit ? '변경사항이 저장됐어요.' : '공유해줘서 고마워요 🙌\n다른 워홀러들에게 큰 도움이 될 거예요!'}</div>
        <button onClick={onClose} style={{ background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'12px 28px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer' }}>닫기</button>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:28, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:20, fontWeight:700, color:C.dark }}>{isEdit ? 'Edit review' : 'Share your experience'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#bbb' }}>✕</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div><label style={labelStyle}>Job title *</label><input style={inputStyle} placeholder="e.g. Service Attendant" value={form.title} onChange={e => set('title', e.target.value)} /></div>
          <div><label style={labelStyle}>Employer / company</label><input style={inputStyle} placeholder="e.g. Sodexo" value={form.company} onChange={e => set('company', e.target.value)} /></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div><label style={labelStyle}>State *</label>
            <select style={inputStyle} value={form.region} onChange={e => set('region', e.target.value)}>
              {['WA','NSW','VIC','QLD','SA','NT','TAS','ACT'].map(r => <option key={r}>{r}</option>)}
            </select></div>
          <div><label style={labelStyle}>Employment type *</label>
            <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
              {['Casual','Part-time','Full-time'].map(t => <option key={t}>{t}</option>)}
            </select></div>
        </div>
        <div style={{ marginBottom:12 }}><label style={labelStyle}>Location (city / suburb)</label><input style={inputStyle} placeholder="e.g. Perth North, Bundaberg" value={form.location} onChange={e => set('location', e.target.value)} /></div>
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>Job category (optional — auto-detected if blank)</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {TAGS.map(t => (
              <button key={t} type="button" onClick={() => set('tags', form.tags.includes(t) ? form.tags.filter(x => x !== t) : [...form.tags, t])}
                style={{ padding:'5px 12px', borderRadius:20, cursor:'pointer', fontSize:12, fontFamily:'Noto Sans KR', border:'1.5px solid', transition:'all 0.15s', background: form.tags.includes(t) ? C.dark : 'transparent', borderColor: form.tags.includes(t) ? C.dark : C.border, color: form.tags.includes(t) ? C.gold : C.sub }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div><label style={labelStyle}>Hourly rate (AUD) *</label><input style={inputStyle} type="number" placeholder="e.g. 32" value={form.hourly} onChange={e => set('hourly', e.target.value)} /></div>
          <div><label style={labelStyle}>Main shift</label><input style={inputStyle} placeholder="e.g. 12h nights" value={form.shift} onChange={e => set('shift', e.target.value)} /></div>
        </div>
        <div style={{ marginBottom:12 }}><label style={labelStyle}>One-line summary * — describe this job in one sentence!</label><input style={inputStyle} placeholder="e.g. Hard work but the savings are real" value={form.review} onChange={e => set('review', e.target.value)} /></div>
        <div style={{ marginBottom:12 }}><label style={labelStyle}>Pros (one per line)</label><textarea style={{ ...inputStyle, height:80, resize:'vertical' }} placeholder={"High pay\nFood & accommodation included\nFast savings"} value={form.pros} onChange={e => set('pros', e.target.value)} /></div>
        <div style={{ marginBottom:12 }}><label style={labelStyle}>Cons (one per line)</label><textarea style={{ ...inputStyle, height:80, resize:'vertical' }} placeholder={"No social life\nPhysically draining"} value={form.cons} onChange={e => set('cons', e.target.value)} /></div>
        <div style={{ marginBottom:12 }}><label style={labelStyle}>A day in the life</label><textarea style={{ ...inputStyle, height:100, resize:'vertical' }} placeholder="e.g. 6am wake up → 7am breakfast room setup → ..." value={form.daily_life} onChange={e => set('daily_life', e.target.value)} /></div>
        <div style={{ marginBottom:12 }}><label style={labelStyle}>Interview tips (optional)</label><textarea style={{ ...inputStyle, height:80, resize:'vertical' }} placeholder="e.g. No experience needed, casual dress OK" value={form.interview_tips} onChange={e => set('interview_tips', e.target.value)} /></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div>
            <label style={labelStyle}>2nd visa eligible</label>
            <div style={{ display:'flex', gap:6 }}>
              {[['Unknown',null],['Yes ✓',true],['No ✗',false]].map(([label,val]) => (
                <button key={label} type="button" onClick={() => set('second_visa', form.second_visa===val ? null : val)}
                  style={{ flex:1, padding:'8px 4px', borderRadius:8, cursor:'pointer', fontSize:12, fontFamily:'Noto Sans KR', border:'1.5px solid', transition:'all 0.15s',
                    background: form.second_visa===val ? (val===true?'#E8F5E9':val===false?'#FFEBEE':C.fill) : 'transparent',
                    borderColor: form.second_visa===val ? (val===true?'#4CAF50':val===false?'#E57373':C.accent) : C.border,
                    color: form.second_visa===val ? (val===true?'#2E7D32':val===false?'#C62828':C.dark) : C.sub }}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>English required</label>
            <div style={{ display:'flex', gap:6 }}>
              {[['하','#4CAF50'],['중','#FF9800'],['상','#F44336']].map(([level,color]) => (
                <button key={level} type="button" onClick={() => set('english_level', form.english_level===level ? '' : level)}
                  style={{ flex:1, padding:'8px 4px', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:'Noto Sans KR', border:'1.5px solid', transition:'all 0.15s',
                    background: form.english_level===level ? `${color}18` : 'transparent',
                    borderColor: form.english_level===level ? color : C.border,
                    color: form.english_level===level ? color : C.sub }}>{ENG_LABELS[level]}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Rating</label>
          <div style={{ display:'flex', gap:8 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => set('stars', n)} style={{ background: n<=form.stars?'rgba(245,166,35,0.12)':'transparent', border:`1.5px solid ${n<=form.stars?'#F5A623':C.border}`, borderRadius:8, padding:'8px 14px', cursor:'pointer', color: n<=form.stars?'#F5A623':C.border, fontSize:18 }}>★</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>📷 현장 사진 <span style={{ color:C.sub, fontWeight:400 }}>(올리면 다른 사람들의 사진도 볼 수 있어요)</span></label>
          <PhotoUploader photos={photos} setPhotos={setPhotos} />
        </div>
        <div style={{ background:'#FFF0F0', border:'1px solid #F5AAAA', borderRadius:8, padding:'10px 14px', marginBottom:12, fontFamily:'Noto Sans KR', fontSize:12, color:'#8B2020', lineHeight:1.8 }}>
          ⚠️ 허위 또는 과장된 정보를 작성할 경우 관리자에 의해 <b>후기가 삭제</b>되고 <b>계정이 정지</b>될 수 있어요.
        </div>
        <button onClick={handleSubmit} disabled={submitting} style={{ width:'100%', background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'14px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:15, cursor: submitting?'default':'pointer', opacity: submitting?0.7:1 }}>
          {submitting ? 'Saving...' : (isEdit ? 'Save changes' : 'Submit')}
        </button>
      </div>
    </div>
  )
}

// ─── QuestionCard ─────────────────────────────────────────────────────────────
function QuestionCard({ q, user, onLoginPrompt, onDelete }) {
  const C = useC()
  const [open, setOpen] = useState(false)
  const [answers, setAnswers] = useState([])
  const [answerText, setAnswerText] = useState('')
  const [posting, setPosting] = useState(false)
  const submitting = useRef(false)

  const fetchAnswers = async () => {
    const { data } = await supabase.from('answers').select('*').eq('question_id', q.id).order('created_at')
    if (!data?.length) { setAnswers([]); return }
    const userIds = [...new Set(data.map(a => a.user_id).filter(Boolean))]
    let nickMap = {}
    if (userIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, nickname').in('id', userIds)
      if (profiles) profiles.forEach(p => { nickMap[p.id] = p.nickname })
    }
    setAnswers(data.map(a => ({ ...a, nickname: nickMap[a.user_id] || 'Anonymous' })))
  }

  useEffect(() => { if (open) fetchAnswers() }, [open])

  const postAnswer = async () => {
    if (!answerText.trim() || submitting.current) return
    submitting.current = true
    setPosting(true)
    const { error } = await supabase.from('answers').insert({ question_id: q.id, user_id: user.id, content: answerText.trim() })
    if (!error) { setAnswerText(''); await fetchAnswers() }
    setPosting(false)
    submitting.current = false
  }

  const isRequest = q.tag === '후기요청'

  return (
    <div onClick={() => setOpen(o => !o)}
      style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, cursor:'pointer', transition:'box-shadow 0.15s', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.05)'}>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex', gap:6, marginBottom:8, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:10, background: isRequest ? '#EEF2FF' : C.fill, color: isRequest ? '#3A4A9A' : C.sub, border:`1px solid ${isRequest ? '#C5D0F0' : C.border}`, borderRadius:10, padding:'1px 8px', fontFamily:'Noto Sans KR' }}>
            {isRequest ? '📝 Review request' : '💬 Question'}
          </span>
          {q.region && <span style={{ fontSize:10, background:C.fill, color:C.sub, border:`1px solid ${C.border}`, borderRadius:10, padding:'1px 7px', fontFamily:'Noto Sans KR' }}>{q.region}</span>}
          {q.tag && !isRequest && <span style={{ fontSize:10, background:C.fill, color:C.sub, border:`1px solid ${C.border}`, borderRadius:10, padding:'1px 7px', fontFamily:'Noto Sans KR' }}>{q.tag}</span>}
        </div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:C.dark, lineHeight:1.65, marginBottom:10 }}>{q.content}</div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR' }}>{q.nickname}</span>
          <span style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR' }}>· {timeAgo(q.created_at)}</span>
          <span style={{ fontSize:11, color: open ? C.accent : C.sub, fontFamily:'Noto Sans KR', marginLeft:'auto' }}>
            💬 {open ? answers.length : (q.answer_count || 0)} · {open ? 'Close ∧' : 'See answers ∨'}
          </span>
          {user?.id === q.user_id && (
            <button onClick={e => { e.stopPropagation(); onDelete(q.id) }}
              style={{ background:'none', border:'none', color:C.sub, fontSize:11, cursor:'pointer', fontFamily:'Noto Sans KR', padding:'0 4px' }}>Delete</button>
          )}
        </div>
      </div>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{ borderTop:`1px solid ${C.border}`, padding:'14px 16px', background:C.bg }}>
          {answers.length === 0 && <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', marginBottom:12, opacity:0.6 }}>No answers yet. Be the first!</div>}
          {answers.map((a, i) => (
            <div key={a.id} style={{ marginBottom:12, paddingBottom:12, borderBottom: i < answers.length-1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:700, color:C.dark, fontFamily:'Noto Sans KR' }}>{a.nickname}</span>
                <span style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR' }}>{timeAgo(a.created_at)}</span>
              </div>
              <div style={{ fontSize:13, color:C.dark, fontFamily:'Noto Sans KR', lineHeight:1.65 }}>{a.content}</div>
            </div>
          ))}
          {user ? (
            <div style={{ display:'flex', gap:8, marginTop:answers.length > 0 ? 4 : 0 }}>
              <input value={answerText} onChange={e => setAnswerText(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); postAnswer() } }}
                placeholder="Write an answer..."
                style={{ flex:1, background:C.fill, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, fontFamily:'Noto Sans KR', color:C.dark, outline:'none' }} />
              <button onClick={postAnswer} disabled={posting || !answerText.trim()}
                style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'8px 14px', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer', opacity:(!answerText.trim()||posting)?0.5:1 }}>Post</button>
            </div>
          ) : (
            <button onClick={onLoginPrompt} style={{ fontSize:12, color:C.accent, fontFamily:'Noto Sans KR', background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 14px', cursor:'pointer', width:'100%' }}>
              Log in to answer
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── QuestionBoard ────────────────────────────────────────────────────────────
function QuestionBoard({ user, onLoginPrompt }) {
  const C = useC()
  const { questions, loading, addQuestion, deleteQuestion } = useQuestions()
  const [filterRegion, setFilterRegion] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formContent, setFormContent] = useState('')
  const [formRegion, setFormRegion] = useState('')
  const [formTag, setFormTag] = useState('')
  const [formType, setFormType] = useState('question')
  const [submitting, setSubmitting] = useState(false)

  const chip = (active) => ({
    padding:'4px 10px', borderRadius:20, cursor:'pointer', fontSize:12, fontFamily:'Noto Sans KR',
    border:'1px solid', transition:'all 0.15s',
    background: active ? C.dark : 'transparent',
    borderColor: active ? C.dark : C.border,
    color: active ? C.gold : C.sub,
  })

  const filtered = questions.filter(q => !filterRegion || q.region === filterRegion)

  const handleSubmit = async () => {
    if (!formContent.trim()) return
    if (!user) { onLoginPrompt(); return }
    setSubmitting(true)
    const tag = formType === 'request' ? '후기요청' : (formTag || '')
    const ok = await addQuestion({ content: formContent, region: formRegion, tag, userId: user.id })
    if (ok) { setFormContent(''); setFormRegion(''); setFormTag(''); setShowForm(false) }
    setSubmitting(false)
  }

  const selectStyle = { background:C.fill, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', fontFamily:'Noto Sans KR', fontSize:12, color:C.dark, outline:'none' }

  return (
    <div>
      {/* 오픈채팅 섹션 */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.dark, fontFamily:'Noto Sans KR', marginBottom:10 }}>💬 Regional open chats</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {Object.entries(OPENCHAT_LINKS).map(([region, url]) => (
            url ? (
              <a key={region} href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                style={{ padding:'5px 12px', borderRadius:20, fontSize:12, fontFamily:'Noto Sans KR', background:C.dark, color:C.gold, textDecoration:'none', border:`1px solid ${C.dark}` }}>
                {region} →
              </a>
            ) : (
              <span key={region} style={{ padding:'5px 12px', borderRadius:20, fontSize:12, fontFamily:'Noto Sans KR', background:'transparent', color:C.sub, border:`1px solid ${C.border}` }}>
                {region}
              </span>
            )
          ))}
        </div>
        <div style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', marginTop:8, opacity:0.7 }}>Links will be added gradually</div>
      </div>

      {/* 헤더 */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR' }}>{filtered.length} posts</div>
        <button onClick={() => user ? setShowForm(v => !v) : onLoginPrompt()}
          style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'7px 16px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          + Post
        </button>
      </div>

      {/* 글쓰기 폼 */}
      {showForm && (
        <div style={{ background:C.card, border:`1.5px solid ${C.accent}`, borderRadius:12, padding:'16px', marginBottom:16 }}>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            {[['question','💬 Question'],['request','📝 Review request']].map(([type, label]) => (
              <button key={type} onClick={() => setFormType(type)}
                style={{ flex:1, padding:'8px', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:'Noto Sans KR', border:'1.5px solid', transition:'all 0.15s',
                  background: formType===type ? C.dark : 'transparent',
                  borderColor: formType===type ? C.dark : C.border,
                  color: formType===type ? C.gold : C.sub }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            <select value={formRegion} onChange={e => setFormRegion(e.target.value)} style={{ ...selectStyle, flex:1 }}>
              <option value="">State (optional)</option>
              {['WA','NSW','VIC','QLD','SA','NT','TAS','ACT'].map(r => <option key={r}>{r}</option>)}
            </select>
            {formType === 'question' && (
              <select value={formTag} onChange={e => setFormTag(e.target.value)} style={{ ...selectStyle, flex:1 }}>
                <option value="">Category (optional)</option>
                {TAGS.map(t => <option key={t}>{t}</option>)}
              </select>
            )}
          </div>
          <textarea value={formContent} onChange={e => setFormContent(e.target.value)}
            placeholder={formType === 'request' ? 'What job/company review do you need? (e.g. Anyone worked at BWS in Perth?)' : 'Ask anything freely. (e.g. Can I do farm work with only basic English?)'}
            style={{ width:'100%', background:C.fill, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'Noto Sans KR', color:C.dark, outline:'none', resize:'vertical', minHeight:80, boxSizing:'border-box' }} />
          <div style={{ display:'flex', gap:8, marginTop:10, justifyContent:'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 14px', fontFamily:'Noto Sans KR', fontSize:13, color:C.sub, cursor:'pointer' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || !formContent.trim()}
              style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'7px 16px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer', opacity:(!formContent.trim()||submitting)?0.5:1 }}>
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {/* 지역 필터 */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
        <button onClick={() => setFilterRegion('')} style={chip(!filterRegion)}>All</button>
        {['WA','NSW','VIC','QLD','SA','NT','TAS','ACT'].map(r => (
          <button key={r} onClick={() => setFilterRegion(filterRegion === r ? '' : r)} style={chip(filterRegion === r)}>{r}</button>
        ))}
      </div>

      {/* 글 목록 */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'40px', color:C.sub, fontFamily:'Noto Sans KR', fontSize:13 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:C.sub, fontFamily:'Noto Sans KR', fontSize:14 }}>
          No posts yet.<br />Ask the first question or request a review!
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(q => (
            <QuestionCard key={q.id} q={q} user={user} onLoginPrompt={onLoginPrompt} onDelete={deleteQuestion} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── BestPosts ────────────────────────────────────────────────────────────────
function BestPosts({ jobs, likedIds, onLike, user, onEdit, onLoginPrompt, onShare, updateJob, incrementView, onAuthorClick, bookmarkedIds, onBookmark, authorStats }) {
  const C = useC()
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  let best = jobs.filter(j => new Date(j.created_at) > monthAgo).sort((a,b) => b.likes - a.likes).slice(0, 5)
  if (best.length < 3) best = [...jobs].sort((a,b) => b.likes - a.likes).slice(0, 5)

  const medals = ['🥇','🥈','🥉']

  if (!jobs.length) return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:C.sub, fontFamily:'Noto Sans KR', fontSize:14 }}>No reviews yet.</div>
  )

  return (
    <div>
      <div style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.sub, marginBottom:16, lineHeight:1.6 }}>
        Most liked reviews this month. {best.length < 3 ? '(All-time)' : ''}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {best.map((job, i) => (
          <div key={job.id} style={{ position:'relative' }}>
            <div style={{ position:'absolute', top:12, left:12, zIndex:5, background: i===0?'#FFD700':i===1?'#C0C0C0':'#CD7F32', color:'#fff', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:800, fontFamily:'Noto Sans KR', boxShadow:'0 2px 6px rgba(0,0,0,0.2)' }}>
              {medals[i] || `${i+1}위`}
            </div>
            <JobCard job={job} liked={likedIds.includes(job.id)} onLike={onLike}
              isBookmarked={bookmarkedIds.includes(job.id)} onBookmark={onBookmark}
              user={user} onEdit={onEdit} onLoginPrompt={onLoginPrompt} onShare={onShare}
              updateJob={updateJob} incrementView={incrementView} onAuthorClick={onAuthorClick}
              authorBadges={getAuthorBadges(job.author || 'Anonymous', authorStats)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── JobCard ──────────────────────────────────────────────────────────────────
function JobCard({ job, liked, onLike, isBookmarked, onBookmark, user, onEdit, onLoginPrompt, onShare, defaultOpen, updateJob, incrementView, onAuthorClick, authorBadges, hasPhotoAccess, onWriteReview }) {
  const C = useC()
  const [open, setOpen] = useState(!!defaultOpen)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [copied, setCopied] = useState(false)
  const submitting = useRef(false)

  const [likedCommentIds, setLikedCommentIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('liked_comment_ids') || '[]') } catch { return [] }
  })

  const toggleCommentLike = (e, commentId) => {
    e.stopPropagation()
    const alreadyLiked = likedCommentIds.includes(commentId)
    const next = alreadyLiked ? likedCommentIds.filter(id => id !== commentId) : [...likedCommentIds, commentId]
    setLikedCommentIds(next)
    localStorage.setItem('liked_comment_ids', JSON.stringify(next))
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, _localLikes: Math.max(0, (c._localLikes??0) + (alreadyLiked?-1:1)) } : c))
  }

  const shareJob = async (e) => {
    e.stopPropagation()
    const url = `${window.location.origin}?id=${job.id}`
    if (navigator.share) {
      try { await navigator.share({ title: `${job.title} — WOHOL`, text: `"${job.review}"`, url }) } catch {}
    } else {
      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
    }
  }

  const hasPhotos = job.photos?.length > 0
  const isOwner = user && job.user_id && user.id === job.user_id

  const handleCaptionSave = async (photoIndex, caption) => {
    const updatedPhotos = job.photos.map((p, i) => i === photoIndex ? { ...p, caption } : p)
    await updateJob(job.id, { photos: JSON.stringify(updatedPhotos) })
  }

  useEffect(() => {
    if (!open) return
    fetchComments()
    incrementView(job.id)
  }, [open, job.id])

  const fetchComments = async () => {
    const { data: commentsData } = await supabase.from('comments').select('*').eq('job_id', job.id).order('created_at')
    if (!commentsData?.length) { setComments([]); return }
    const userIds = [...new Set(commentsData.map(c => c.user_id).filter(Boolean))]
    const { data: profilesData } = await supabase.from('profiles').select('id, nickname').in('id', userIds)
    const nickMap = {}
    if (profilesData) profilesData.forEach(p => { nickMap[p.id] = p.nickname })
    setComments(commentsData.map(c => ({ ...c, nickname: nickMap[c.user_id] || 'Anonymous', _localLikes: 0 })))
  }

  const postComment = async (e) => {
    e.stopPropagation()
    if (!commentText.trim() || submitting.current) return
    submitting.current = true; setPosting(true)
    const { error } = await supabase.from('comments').insert({ job_id: job.id, user_id: user.id, content: commentText.trim() })
    if (!error) { setCommentText(''); await fetchComments() }
    setPosting(false); submitting.current = false
  }

  const postReply = async (e) => {
    e.stopPropagation()
    if (!replyText.trim() || !replyTo || submitting.current) return
    submitting.current = true; setPosting(true)
    const { error } = await supabase.from('comments').insert({ job_id: job.id, user_id: user.id, content: replyText.trim(), parent_id: replyTo.id })
    if (!error) { setReplyText(''); setReplyTo(null); await fetchComments() }
    setPosting(false); submitting.current = false
  }

  const deleteComment = async (e, commentId) => {
    e.stopPropagation()
    await supabase.from('comments').delete().eq('id', commentId)
    await fetchComments()
  }

  const topLevel = comments.filter(c => !c.parent_id)
  const replies = (parentId) => comments.filter(c => c.parent_id === parentId)

  const handleToggle = () => {
    if (!user && !open) { onLoginPrompt(); return }
    setOpen(o => !o)
  }

  return (
    <div onClick={handleToggle}
      style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden', cursor:'pointer', transition:'box-shadow 0.18s', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', position:'relative' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'}>

      {/* 북마크 버튼 */}
      <button onClick={e => { e.stopPropagation(); onBookmark(job.id) }}
        title={isBookmarked ? '북마크 해제' : '북마크'}
        style={{ position:'absolute', top:10, right:10, zIndex:10, background: isBookmarked ? C.accent : 'rgba(0,0,0,0.18)', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.18s', backdropFilter:'blur(4px)' }}
        onMouseEnter={e => e.currentTarget.style.background = isBookmarked ? '#B07830' : 'rgba(0,0,0,0.35)'}
        onMouseLeave={e => e.currentTarget.style.background = isBookmarked ? C.accent : 'rgba(0,0,0,0.18)'}>
        🔖
      </button>

      {hasPhotos && (
        isOwner || hasPhotoAccess ? (
          <div style={{ paddingTop:14 }}><PhotoGallery photos={job.photos} isOwner={isOwner} onCaptionSave={handleCaptionSave} /></div>
        ) : (
          <div style={{ position:'relative', paddingTop:14 }}>
            <div style={{ filter:'blur(8px)', pointerEvents:'none', userSelect:'none' }}>
              <PhotoGallery photos={job.photos} isOwner={false} onCaptionSave={() => {}} />
            </div>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
              <div style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'14px 20px', textAlign:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.12)' }}>
                <div style={{ fontSize:20, marginBottom:6 }}>📷</div>
                <div style={{ fontFamily:'Noto Sans KR', fontSize:12, color:'#2C1A00', fontWeight:700, marginBottom:4 }}>현장 사진을 올리면 볼 수 있어요</div>
                <div style={{ fontFamily:'Noto Sans KR', fontSize:11, color:'#8A7060', marginBottom:10 }}>후기 작성 시 사진을 1장 이상 올리면 잠금 해제</div>
                <button onClick={e => { e.stopPropagation(); onWriteReview() }}
                  style={{ background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:8, padding:'7px 16px', fontFamily:'Noto Sans KR', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  ✍️ 사진 포함해서 후기 쓰기
                </button>
              </div>
            </div>
          </div>
        )
      )}

      <div style={{ padding:'16px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div style={{ flex:1, minWidth:0, paddingRight:40 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
              <span style={{ fontFamily:"'Noto Sans KR'", fontSize:18, fontWeight:700, color:C.dark }}>{job.title}</span>
              {job.tags?.map(t => <span key={t} style={{ fontSize:10, color:C.sub, fontFamily:'Noto Sans KR', opacity:0.7 }}>{t}</span>)}
              {hasPhotos && <span style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', opacity:0.7 }}>📷 {job.photos.length}</span>}
            </div>
            {job.company && <div style={{ fontSize:14, fontWeight:700, color:C.dark, fontFamily:'Noto Sans KR', marginBottom:4, opacity:0.75 }}>{job.company}</div>}
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR' }}>{job.region}{job.location ? ` · ${job.location}` : ''} · {job.type}</span>
              {job.second_visa === true  && <span style={{ fontSize:10, background:'#E8F5E9', color:'#2E7D32', border:'1px solid #A5D6A7', borderRadius:10, padding:'1px 7px', fontFamily:'Noto Sans KR' }}>2nd ✓</span>}
              {job.second_visa === false && <span style={{ fontSize:10, background:'#F5F5F5', color:'#AAAAAA', border:'1px solid #E0E0E0', borderRadius:10, padding:'1px 7px', fontFamily:'Noto Sans KR' }}>2nd ✗</span>}
              {job.english_level && <span style={{ fontSize:10, background: job.english_level==='하'?'#E8F5E9':job.english_level==='중'?'#FFF8E1':'#FFEBEE', color: job.english_level==='하'?'#2E7D32':job.english_level==='중'?'#FF9800':'#C62828', border:`1px solid ${job.english_level==='하'?'#A5D6A7':job.english_level==='중'?'#FFD54F':'#EF9A9A'}`, borderRadius:10, padding:'1px 7px', fontFamily:'Noto Sans KR' }}>Eng {ENG_LABELS[job.english_level]}</span>}
            </div>
          </div>
          <div style={{ background:C.dark, color:C.gold, borderRadius:10, padding:'8px 14px', textAlign:'center', minWidth:56, flexShrink:0 }}>
            <div style={{ fontFamily:'monospace', fontWeight:800, fontSize:20, lineHeight:1 }}>${job.hourly}</div>
            <div style={{ fontSize:10, opacity:0.6, marginTop:2 }}>/hr AUD</div>
          </div>
        </div>

        <div style={{ background:C.fill, borderLeft:`3px solid ${C.accent}`, borderRadius:'0 8px 8px 0', padding:'10px 14px', marginBottom:12, fontFamily:'Noto Sans KR', fontSize:13, color:C.dark, fontStyle:'italic', lineHeight:1.6, opacity:0.85 }}>
          "{job.review}"
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Stars n={job.stars} />
            {isOwner && (
              <button onClick={e => { e.stopPropagation(); onEdit(job) }}
                style={{ background:'transparent', border:`1px solid ${C.accent}`, borderRadius:6, padding:'2px 8px', cursor:'pointer', fontFamily:'Noto Sans KR', fontSize:11, color:C.accent }}>
                Edit
              </button>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {/* 뱃지 */}
            {authorBadges?.map(b => (
              <span key={b.emoji} title={b.label} style={{ fontSize:13, cursor:'default' }}>{b.emoji}</span>
            ))}
            <div onClick={e => { e.stopPropagation(); onAuthorClick(job.author || 'Anonymous') }}
              style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', opacity:0.8, cursor:'pointer', textDecoration:'underline', textDecorationStyle:'dotted', textUnderlineOffset:2 }}>
              {job.author || 'Anonymous'}
            </div>
            {/* 도움됐어요 (구 좋아요) */}
            <button onClick={e => { e.stopPropagation(); onLike(job.id) }}
              style={{ display:'flex', alignItems:'center', gap:4, background: liked ? 'rgba(200,150,60,0.1)' : 'transparent', border:`1px solid ${liked ? C.accent : C.border}`, borderRadius:20, padding:'4px 10px', cursor:'pointer', fontFamily:'Noto Sans KR', fontSize:12, color: liked ? C.accent : C.sub, transition:'all 0.15s' }}>
              <span>{liked ? '👍' : '👍'}</span>
              <span style={{ fontSize:11 }}>{liked ? 'Helpful ✓' : 'Helpful?'} {job.likes > 0 ? job.likes : ''}</span>
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:13, color:C.sub, opacity:0.7 }}>
              <span>💬</span><span style={{ fontSize:11 }}>{comments.length}</span>
            </div>
            {job.views > 0 && <div style={{ display:'flex', alignItems:'center', gap:2, fontSize:11, color:C.sub, opacity:0.6 }}><span>👁</span><span>{job.views}</span></div>}
            <button onClick={shareJob}
              style={{ display:'flex', alignItems:'center', gap:4, background: copied?'rgba(200,150,60,0.1)':'transparent', border:`1px solid ${copied?C.accent:C.border}`, borderRadius:20, padding:'4px 10px', cursor:'pointer', fontFamily:'Noto Sans KR', fontSize:12, color: copied?C.accent:C.sub, transition:'all 0.15s' }}>
              {copied ? '✓ Copied' : '🔗 Share'}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:'16px 20px 20px', background:C.bg }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom: (job.daily_life||job.interview_tips) ? 10 : 0 }}>
            <div style={{ background:'#F3FAF3', borderRadius:10, padding:14 }}>
              <div style={{ fontSize:11, color:'#3A7A3A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:8 }}>👍 Pros</div>
              {job.pros.map((p,i) => <div key={i} style={{ fontSize:13, color:'#2A5A2A', fontFamily:'Noto Sans KR', marginBottom:4, lineHeight:1.5 }}>· {p}</div>)}
            </div>
            <div style={{ background:'#FAF3F3', borderRadius:10, padding:14 }}>
              <div style={{ fontSize:11, color:'#8A3A3A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:8 }}>👎 Cons</div>
              {job.cons.map((c,i) => <div key={i} style={{ fontSize:13, color:'#6A2A2A', fontFamily:'Noto Sans KR', marginBottom:4, lineHeight:1.5 }}>· {c}</div>)}
            </div>
          </div>
          {job.daily_life && (
            <div style={{ background:C.fill, borderRadius:10, padding:14, marginBottom: job.interview_tips?10:0 }}>
              <div style={{ fontSize:11, color:C.accent, fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:8 }}>🌅 A day in the life</div>
              <div style={{ fontSize:13, color:C.dark, fontFamily:'Noto Sans KR', lineHeight:1.8, whiteSpace:'pre-line', opacity:0.85 }}>{job.daily_life}</div>
            </div>
          )}
          {job.interview_tips && (
            <div style={{ background:'#F0F4FF', borderRadius:10, padding:14 }}>
              <div style={{ fontSize:11, color:'#3A4A8A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:8 }}>💡 Interview tips</div>
              <div style={{ fontSize:13, color:'#2A3060', fontFamily:'Noto Sans KR', lineHeight:1.8, whiteSpace:'pre-line' }}>{job.interview_tips}</div>
            </div>
          )}

          <TranslateButton fields={[job.review, ...(job.pros||[]), ...(job.cons||[]), job.daily_life, job.interview_tips].filter(Boolean)} />

          {/* Comments */}
          <div style={{ marginTop:14, borderTop:`1px solid ${C.border}`, paddingTop:14 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:10 }}>Comments {comments.length > 0 ? comments.length : ''}</div>
            {topLevel.length === 0 && <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', opacity:0.6, marginBottom:10 }}>Be the first to comment</div>}

            {topLevel.map(c => (
              <div key={c.id} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:C.dark, fontFamily:'Noto Sans KR', marginRight:6 }}>{c.nickname}</span>
                    <span style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', marginRight:8 }}>{timeAgo(c.created_at)}</span>
                    <span style={{ fontSize:13, color:C.dark, fontFamily:'Noto Sans KR', lineHeight:1.6 }}>{c.content}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                    <button onClick={e => toggleCommentLike(e, c.id)}
                      style={{ display:'flex', alignItems:'center', gap:2, background:'none', border:'none', color: likedCommentIds.includes(c.id)?'#E05060':C.sub, fontSize:11, cursor:'pointer', padding:'0 4px', fontFamily:'Noto Sans KR' }}>
                      {likedCommentIds.includes(c.id) ? '❤️' : '🤍'}{(c._localLikes > 0) && <span>{c._localLikes}</span>}
                    </button>
                    {user && replyTo?.id !== c.id && (
                      <button onClick={e => { e.stopPropagation(); setReplyTo({ id:c.id, nickname:c.nickname }); setReplyText('') }}
                        style={{ background:'none', border:'none', color:C.accent, fontSize:11, cursor:'pointer', padding:'0 4px', fontFamily:'Noto Sans KR' }}>Reply</button>
                    )}
                    {user?.id === c.user_id && (
                      <button onClick={e => deleteComment(e, c.id)} style={{ background:'none', border:'none', color:C.sub, fontSize:11, cursor:'pointer', padding:'0 4px', fontFamily:'Noto Sans KR' }}>Delete</button>
                    )}
                  </div>
                </div>

                {replies(c.id).map(r => (
                  <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:8, paddingLeft:16, borderLeft:`2px solid ${C.border}` }}>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:C.dark, fontFamily:'Noto Sans KR', marginRight:6 }}>{r.nickname}</span>
                      <span style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', marginRight:8 }}>{timeAgo(r.created_at)}</span>
                      <span style={{ fontSize:13, color:C.dark, fontFamily:'Noto Sans KR', lineHeight:1.6 }}>{r.content}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                      <button onClick={e => toggleCommentLike(e, r.id)}
                        style={{ display:'flex', alignItems:'center', gap:2, background:'none', border:'none', color: likedCommentIds.includes(r.id)?'#E05060':C.sub, fontSize:11, cursor:'pointer', padding:'0 4px', fontFamily:'Noto Sans KR' }}>
                        {likedCommentIds.includes(r.id) ? '❤️' : '🤍'}{(r._localLikes > 0) && <span>{r._localLikes}</span>}
                      </button>
                      {user?.id === r.user_id && (
                        <button onClick={e => deleteComment(e, r.id)} style={{ background:'none', border:'none', color:C.sub, fontSize:11, cursor:'pointer', padding:'0 4px', fontFamily:'Noto Sans KR' }}>Delete</button>
                      )}
                    </div>
                  </div>
                ))}

                {replyTo?.id === c.id && (
                  <div style={{ display:'flex', gap:8, marginTop:8, paddingLeft:16 }}>
                    <input autoFocus value={replyText} onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); postReply(e) } }}
                      placeholder={`@${replyTo.nickname} reply...`}
                      style={{ flex:1, background:C.fill, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 11px', fontSize:13, fontFamily:'Noto Sans KR', color:C.dark, outline:'none' }} />
                    <button onClick={postReply} disabled={posting||!replyText.trim()}
                      style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'7px 12px', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer', opacity:(!replyText.trim()||posting)?0.5:1 }}>Post</button>
                    <button onClick={e => { e.stopPropagation(); setReplyTo(null) }}
                      style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', fontFamily:'Noto Sans KR', fontSize:12, color:C.sub, cursor:'pointer' }}>Cancel</button>
                  </div>
                )}
              </div>
            ))}

            {user ? (
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); postComment(e) } }}
                  placeholder="Add a comment..."
                  style={{ flex:1, background:C.fill, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, fontFamily:'Noto Sans KR', color:C.dark, outline:'none' }} />
                <button onClick={postComment} disabled={posting||!commentText.trim()}
                  style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'8px 14px', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer', opacity:(!commentText.trim()||posting)?0.5:1 }}>Post</button>
              </div>
            ) : (
              <button onClick={onLoginPrompt} style={{ fontSize:12, color:C.accent, fontFamily:'Noto Sans KR', background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 14px', cursor:'pointer', width:'100%' }}>
                Log in to comment
              </button>
            )}
          </div>

          {/* CTA */}
          <div style={{ marginTop:14, background:`linear-gradient(135deg, rgba(200,150,60,0.06), rgba(44,26,0,0.03))`, border:`1px solid rgba(200,150,60,0.25)`, borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }} onClick={e => e.stopPropagation()}>
            <div>
              <div style={{ fontFamily:'Noto Sans KR', fontSize:13, fontWeight:700, color:C.dark }}>Had a similar experience?</div>
              <div style={{ fontFamily:'Noto Sans KR', fontSize:11, color:C.sub, marginTop:2 }}>One review can really help the next WHV worker</div>
            </div>
            <button onClick={() => onShare()} style={{ flexShrink:0, background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'8px 14px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
              Share experience →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ReviewTypeModal ──────────────────────────────────────────────────────────
function ReviewTypeModal({ onClose, onSelect }) {
  const C = useC()
  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:32, width:'100%', maxWidth:360, textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:18, fontWeight:700, color:C.dark, marginBottom:6 }}>What type of review?</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.sub, marginBottom:24 }}>Select review type</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => onSelect('general')}
            style={{ background:C.fill, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'16px', cursor:'pointer', textAlign:'left', transition:'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor=C.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor=C.border}>
            <div style={{ fontFamily:'Noto Sans KR', fontSize:15, fontWeight:700, color:C.dark, marginBottom:4 }}>📋 General review</div>
            <div style={{ fontFamily:'Noto Sans KR', fontSize:12, color:C.sub }}>Cafe, farm, construction, and more</div>
          </button>
          <button onClick={() => onSelect('fifo')}
            style={{ background:'rgba(200,150,60,0.06)', border:`1.5px solid rgba(200,150,60,0.3)`, borderRadius:12, padding:'16px', cursor:'pointer', textAlign:'left', transition:'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor=C.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor='rgba(200,150,60,0.3)'}>
            <div style={{ fontFamily:'Noto Sans KR', fontSize:15, fontWeight:700, color:C.dark, marginBottom:4 }}>⛏️ FIFO camp review</div>
            <div style={{ fontFamily:'Noto Sans KR', fontSize:12, color:C.sub }}>For FIFO camp service attendants</div>
          </button>
        </div>
        <button onClick={onClose} style={{ marginTop:16, background:'transparent', border:'none', color:C.sub, fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

// ─── FIFO 상수 ────────────────────────────────────────────────────────────────
const KNOWN_CAMPS = ['Punurunha','Hope Downs 1','Hope Downs 4','Newman Camp','Yandi','Mining Area C','Cloudbreak','Christmas Creek','Karara','Sino Iron','Yandicoogina','Tom Price','Paraburdoo','Pannawonica','South Flank','Jimblebar','Wheelarra']
const CATERING_COS = ['Sodexo','Compass Group','Downer','ISS','Broadspectrum','Other']
const CAMP_POSITIONS = ['Kitchen Hand','Housekeeping','Utility','Bar','Retail','Other']

// ─── CampReviewModal ──────────────────────────────────────────────────────────
function CampReviewModal({ onClose, addReview, updateReview, editData, user }) {
  const C = useC()
  const isEdit = !!editData
  const EMPTY = { camp_name:'', catering_company:'', positions:[], position_custom:'', review:'', pros:'', cons:'', daily_life:'', food_satisfaction:null, accommodation_satisfaction:null, work_satisfaction:null, swing_satisfaction:null }
  const toForm = (d) => d ? {
    camp_name: d.camp_name || '',
    catering_company: d.catering_company || '',
    positions: d.position ? d.position.split(', ').filter(Boolean) : [],
    position_custom: '',
    review: d.review || '',
    pros: Array.isArray(d.pros) ? d.pros.join('\n') : (d.pros || ''),
    cons: Array.isArray(d.cons) ? d.cons.join('\n') : (d.cons || ''),
    daily_life: d.daily_life || '',
    food_satisfaction: d.food_satisfaction ?? null,
    accommodation_satisfaction: d.accommodation_satisfaction ?? null,
    work_satisfaction: d.work_satisfaction ?? null,
    swing_satisfaction: d.swing_satisfaction ?? null,
  } : EMPTY
  const [form, setForm] = useState(() => toForm(editData))
  const [campInput, setCampInput] = useState(editData?.camp_name || '')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const suggestions = campInput.length > 0
    ? KNOWN_CAMPS.filter(c => c.toLowerCase().includes(campInput.toLowerCase()))
    : KNOWN_CAMPS

  const handleSubmit = async () => {
    if (!form.camp_name || !form.review) { alert('Camp name and summary are required!'); return }
    setSubmitting(true)
    const finalPositions = form.positions.map(p => p === 'Other' ? (form.position_custom || 'Other') : p)
    const { positions, position_custom, ...rest } = form
    const payload = { ...rest, position: finalPositions.join(', ') || null }
    const errMsg = isEdit ? await updateReview(editData.id, payload) : await addReview(payload)
    setSubmitting(false)
    if (!errMsg) setDone(true)
    else alert(`Save failed: ${errMsg}`)
  }

  const inputStyle = { width:'100%', background:C.fill, border:`1.5px solid ${C.border}`, borderRadius:8, padding:'10px 12px', color:C.dark, fontSize:14, fontFamily:'Noto Sans KR', outline:'none', boxSizing:'border-box' }
  const labelStyle = { fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', marginBottom:6, display:'block' }

  if (done) return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:40, width:'100%', maxWidth:400, textAlign:'center' }}>
        <div style={{ fontSize:44, marginBottom:16 }}>⛏️</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:22, fontWeight:700, color:C.dark, marginBottom:8 }}>{isEdit ? 'Updated!' : 'Review submitted!'}</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:C.sub, lineHeight:1.7, marginBottom:24 }}>{isEdit ? 'Your changes have been saved.' : 'This will help the next WHV worker.'}</div>
        <button onClick={onClose} style={{ background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'12px 28px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer' }}>Close</button>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:28, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:20, fontWeight:700, color:C.dark }}>⛏️ FIFO Camp Review</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#bbb' }}>✕</button>
        </div>

        {/* 캠프 이름 */}
        <div style={{ marginBottom:12, position:'relative' }}>
          <label style={labelStyle}>Camp name *</label>
          <input style={inputStyle} placeholder="e.g. Punurunha, Hope Downs 1"
            value={campInput}
            onChange={e => { setCampInput(e.target.value); set('camp_name', e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:C.card, border:`1px solid ${C.border}`, borderRadius:8, zIndex:10, maxHeight:180, overflowY:'auto', boxShadow:'0 4px 16px rgba(0,0,0,0.1)' }}>
              {suggestions.map(c => (
                <div key={c} onClick={() => { set('camp_name', c); setCampInput(c); setShowSuggestions(false) }}
                  style={{ padding:'8px 14px', fontFamily:'Noto Sans KR', fontSize:13, color:C.dark, cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background=C.fill}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 케이터링 회사 */}
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>Catering company</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CATERING_COS.map(c => (
              <button key={c} type="button" onClick={() => set('catering_company', form.catering_company===c ? '' : c)}
                style={{ padding:'5px 12px', borderRadius:20, cursor:'pointer', fontSize:12, fontFamily:'Noto Sans KR', border:'1.5px solid', transition:'all 0.15s', background: form.catering_company===c ? C.dark : 'transparent', borderColor: form.catering_company===c ? C.dark : C.border, color: form.catering_company===c ? C.gold : C.sub }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 포지션 (다중선택) */}
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>Position(s) — multiple allowed</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CAMP_POSITIONS.map(p => {
              const active = form.positions.includes(p)
              return (
                <button key={p} type="button" onClick={() => set('positions', active ? form.positions.filter(x => x !== p) : [...form.positions, p])}
                  style={{ padding:'5px 12px', borderRadius:20, cursor:'pointer', fontSize:12, fontFamily:'Noto Sans KR', border:'1.5px solid', transition:'all 0.15s', background: active ? C.dark : 'transparent', borderColor: active ? C.dark : C.border, color: active ? C.gold : C.sub }}>
                  {p}
                </button>
              )
            })}
          </div>
          {form.positions.includes('Other') && (
            <input style={{ ...inputStyle, marginTop:8 }} placeholder="Enter custom position" value={form.position_custom} onChange={e => set('position_custom', e.target.value)} />
          )}
        </div>

        {/* 한줄평 */}
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>One-line summary *</label>
          <input style={inputStyle} placeholder="Summarize this camp in one sentence!" value={form.review} onChange={e => set('review', e.target.value)} />
        </div>

        {/* 장단점 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div><label style={labelStyle}>Pros (one per line)</label><textarea style={{ ...inputStyle, height:80, resize:'vertical' }} placeholder={'Good room quality\nGreat meals\nFast savings'} value={form.pros} onChange={e => set('pros', e.target.value)} /></div>
          <div><label style={labelStyle}>Cons (one per line)</label><textarea style={{ ...inputStyle, height:80, resize:'vertical' }} placeholder={'No social life\nSlow internet'} value={form.cons} onChange={e => set('cons', e.target.value)} /></div>
        </div>

        {/* 하루일과 */}
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>Daily routine</label>
          <textarea style={{ ...inputStyle, height:100, resize:'vertical' }} placeholder="e.g. 5:30am wake up → 6am breakfast service → 8am room service → ..." value={form.daily_life} onChange={e => set('daily_life', e.target.value)} />
        </div>

        {/* 만족도 4개 */}
        {[
          { key:'food_satisfaction', label:'🍽️ Food (1–10)' },
          { key:'accommodation_satisfaction', label:'🛏️ Accommodation (1–10)' },
          { key:'work_satisfaction', label:'💼 Work (1–10)' },
          { key:'swing_satisfaction', label:'⛏️ Overall swing (1–10)' },
        ].map(({ key, label }) => (
          <div key={key} style={{ marginBottom:14 }}>
            <label style={labelStyle}>{label} {form[key] ? `— ${form[key]}` : ''}</label>
            <div style={{ display:'flex', gap:4 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => {
                const color = n <= 3 ? '#E53935' : n <= 6 ? '#FF9800' : '#43A047'
                const active = form[key] === n
                return (
                  <button key={n} onClick={() => set(key, active ? null : n)}
                    style={{ flex:1, padding:'7px 0', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'Noto Sans KR', border:'1.5px solid', transition:'all 0.15s',
                      background: active ? color : 'transparent',
                      borderColor: active ? color : C.border,
                      color: active ? '#fff' : C.sub }}>
                    {n}
                  </button>
                )
              })}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
              <span style={{ fontSize:10, color:'#E53935', fontFamily:'Noto Sans KR' }}>Poor</span>
              <span style={{ fontSize:10, color:'#43A047', fontFamily:'Noto Sans KR' }}>Great</span>
            </div>
          </div>
        ))}

        <button onClick={handleSubmit} disabled={submitting} style={{ width:'100%', background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'14px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:15, cursor: submitting?'default':'pointer', opacity: submitting?0.7:1 }}>
          {submitting ? 'Saving...' : (isEdit ? 'Save changes' : 'Submit review')}
        </button>
      </div>
    </div>
  )
}

// ─── CampReviewCard ───────────────────────────────────────────────────────────
function CampReviewCard({ review, user, onDelete, onEdit }) {
  const C = useC()
  const [open, setOpen] = useState(false)

  return (
    <div onClick={() => setOpen(o => !o)}
      style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, cursor:'pointer', transition:'box-shadow 0.15s', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.05)'}>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:6 }}>
              <span style={{ fontFamily:'Noto Sans KR', fontSize:15, fontWeight:700, color:C.dark }}>{review.position || 'Service Attendant'}</span>
              {review.catering_company && <span style={{ fontSize:11, background:C.fill, color:C.sub, border:`1px solid ${C.border}`, borderRadius:10, padding:'1px 8px', fontFamily:'Noto Sans KR' }}>{review.catering_company}</span>}
              {review.swing && <span style={{ fontSize:11, background:'rgba(200,150,60,0.08)', color:C.accent, border:`1px solid rgba(200,150,60,0.3)`, borderRadius:10, padding:'1px 8px', fontFamily:'Noto Sans KR' }}>🔄 {review.swing}</span>}
            </div>
            <div style={{ background:C.fill, borderLeft:`3px solid ${C.accent}`, borderRadius:'0 6px 6px 0', padding:'8px 12px', fontFamily:'Noto Sans KR', fontSize:13, color:C.dark, fontStyle:'italic', lineHeight:1.5, marginBottom:8 }}>
              "{review.review}"
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <Stars n={review.stars} />
              {review.hourly && <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:13, color:C.dark }}>${review.hourly}/hr</span>}
              {[
                { key:'food_satisfaction', label:'🍽️' },
                { key:'accommodation_satisfaction', label:'🛏️' },
                { key:'work_satisfaction', label:'💼' },
                { key:'swing_satisfaction', label:'⛏️' },
              ].filter(({ key }) => review[key] != null).map(({ key, label }) => {
                const n = review[key]
                return (
                  <span key={key} style={{ fontSize:11, fontFamily:'Noto Sans KR', fontWeight:700, padding:'1px 7px', borderRadius:10, border:'1px solid',
                    background: n <= 3 ? '#FFEBEE' : n <= 6 ? '#FFF8E1' : '#E8F5E9',
                    color: n <= 3 ? '#C62828' : n <= 6 ? '#FF8F00' : '#2E7D32',
                    borderColor: n <= 3 ? '#EF9A9A' : n <= 6 ? '#FFD54F' : '#A5D6A7' }}>
                    {label} {n}
                  </span>
                )
              })}
              <span style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', marginLeft:'auto' }}>{review.nickname} · {timeAgo(review.created_at)}</span>
              {user?.id === review.user_id && (
                <>
                  <button onClick={e => { e.stopPropagation(); onEdit(review) }}
                    style={{ background:'transparent', border:`1px solid ${C.accent}`, borderRadius:6, padding:'2px 8px', cursor:'pointer', fontFamily:'Noto Sans KR', fontSize:11, color:C.accent }}>Edit</button>
                  <button onClick={e => { e.stopPropagation(); onDelete(review.id) }}
                    style={{ background:'none', border:'none', color:C.sub, fontSize:11, cursor:'pointer', fontFamily:'Noto Sans KR' }}>Delete</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {open && (review.pros?.length > 0 || review.cons?.length > 0 || review.daily_life) && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:'14px 16px', background:C.bg }} onClick={e => e.stopPropagation()}>
          {(review.pros?.length > 0 || review.cons?.length > 0) && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom: review.daily_life ? 10 : 0 }}>
              {review.pros?.length > 0 && (
                <div style={{ background:'#F3FAF3', borderRadius:10, padding:12 }}>
                  <div style={{ fontSize:11, color:'#3A7A3A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:6 }}>👍 Pros</div>
                  {review.pros.map((p,i) => <div key={i} style={{ fontSize:12, color:'#2A5A2A', fontFamily:'Noto Sans KR', marginBottom:3, lineHeight:1.5 }}>· {p}</div>)}
                </div>
              )}
              {review.cons?.length > 0 && (
                <div style={{ background:'#FAF3F3', borderRadius:10, padding:12 }}>
                  <div style={{ fontSize:11, color:'#8A3A3A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:6 }}>👎 Cons</div>
                  {review.cons.map((c,i) => <div key={i} style={{ fontSize:12, color:'#6A2A2A', fontFamily:'Noto Sans KR', marginBottom:3, lineHeight:1.5 }}>· {c}</div>)}
                </div>
              )}
            </div>
          )}
          {review.daily_life && (
            <div style={{ background:C.fill, borderRadius:10, padding:12 }}>
              <div style={{ fontSize:11, color:C.accent, fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:6 }}>🌅 Daily routine</div>
              <div style={{ fontSize:12, color:C.dark, fontFamily:'Noto Sans KR', lineHeight:1.8, whiteSpace:'pre-line' }}>{review.daily_life}</div>
            </div>
          )}
          <TranslateButton fields={[review.review, ...(review.pros||[]), ...(review.cons||[]), review.daily_life].filter(Boolean)} />
        </div>
      )}
    </div>
  )
}

// ─── FIFOTab ──────────────────────────────────────────────────────────────────
function FIFOTab({ user, onLoginPrompt, reviews, loading, addReview, updateReview, deleteReview }) {
  const C = useC()
  const [showModal, setShowModal] = useState(false)
  const [editReview, setEditReview] = useState(null)
  const [selectedCamp, setSelectedCamp] = useState('')
  const [selectedPosition, setSelectedPosition] = useState('')
  const [selectedSwing, setSelectedSwing] = useState('')

  const chip = (active) => ({
    padding:'4px 10px', borderRadius:20, cursor:'pointer', fontSize:12, fontFamily:'Noto Sans KR', border:'1px solid', transition:'all 0.15s',
    background: active ? C.dark : 'transparent', borderColor: active ? C.dark : C.border, color: active ? C.gold : C.sub,
  })

  const filtered = reviews
    .filter(r => !selectedCamp || r.camp_name === selectedCamp)
    .filter(r => !selectedPosition || r.position === selectedPosition)
    .filter(r => !selectedSwing || r.swing === selectedSwing)

  // 후기 있는 캠프 목록 (후기 많은 순)
  const campCounts = {}
  reviews.forEach(r => { campCounts[r.camp_name] = (campCounts[r.camp_name] || 0) + 1 })
  const campsWithReviews = Object.entries(campCounts).sort((a,b) => b[1]-a[1]).map(([name]) => name)

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:16, fontWeight:700, color:C.dark }}>⛏️ FIFO Camp Reviews</div>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:12, color:C.sub, marginTop:2 }}>Real experiences from camp service attendants</div>
        </div>
        <button onClick={() => user ? setShowModal(true) : onLoginPrompt()}
          style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'8px 16px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          + Write a review
        </button>
      </div>

      {/* 캠프 지도 */}
      <div style={{ marginBottom:16 }}>
        <Suspense fallback={<div style={{ height:320, background:C.fill, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Noto Sans KR', fontSize:13, color:C.sub }}>Loading map...</div>}>
          <LazyCampMapView reviews={reviews} onSelectCamp={setSelectedCamp} selectedCamp={selectedCamp} />
        </Suspense>
        <div style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', marginTop:6, textAlign:'center', opacity:0.7 }}>Click a pin to filter by camp · camps with reviews show a count</div>
      </div>

      {/* 캠프 필터 */}
      {campsWithReviews.length > 0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', marginBottom:6 }}>Filter by camp</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button onClick={() => setSelectedCamp('')} style={chip(!selectedCamp)}>All ({reviews.length})</button>
            {campsWithReviews.map(name => (
              <button key={name} onClick={() => setSelectedCamp(selectedCamp===name ? '' : name)} style={chip(selectedCamp===name)}>
                {name} ({campCounts[name]})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 포지션 / 스윙 필터 */}
      {reviews.length > 0 && (
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {[...new Set(reviews.map(r => r.position).filter(Boolean))].map(p => (
              <button key={p} onClick={() => setSelectedPosition(selectedPosition===p ? '' : p)} style={{ ...chip(selectedPosition===p), fontSize:11, padding:'3px 8px' }}>{p}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {[...new Set(reviews.map(r => r.swing).filter(Boolean))].map(s => (
              <button key={s} onClick={() => setSelectedSwing(selectedSwing===s ? '' : s)} style={{ ...chip(selectedSwing===s), fontSize:11, padding:'3px 8px' }}>🔄 {s}</button>
            ))}
          </div>
        </div>
      )}

      {/* 후기 목록 */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'40px', color:C.sub, fontFamily:'Noto Sans KR', fontSize:13 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>⛏️</div>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:15, fontWeight:700, color:C.dark, marginBottom:8 }}>No camp reviews yet</div>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.sub, lineHeight:1.7, marginBottom:20 }}>
            Been to Punurunha, Hope Downs 1 or another camp?<br />Be the first to leave a review!
          </div>
          <button onClick={() => user ? setShowModal(true) : onLoginPrompt()}
            style={{ background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'10px 24px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            Write the first review
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {selectedCamp ? (
            <>
              <div style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.sub, marginBottom:4 }}>
                <b style={{ color:C.dark }}>{selectedCamp}</b> — {filtered.length} review{filtered.length !== 1 ? 's' : ''}
              </div>
              {filtered.map(r => <CampReviewCard key={r.id} review={r} user={user} onDelete={deleteReview} onEdit={setEditReview} />)}
            </>
          ) : (
            campsWithReviews.map(campName => {
              const campReviews = filtered.filter(r => r.camp_name === campName)
              if (!campReviews.length) return null
              const avgStars = Math.round(campReviews.reduce((s,r) => s+(r.stars||4), 0) / campReviews.length)
              return (
                <div key={campName}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, cursor:'pointer' }}
                    onClick={() => setSelectedCamp(campName)}>
                    <div style={{ fontFamily:'Noto Sans KR', fontSize:14, fontWeight:700, color:C.dark }}>{campName}</div>
                    <Stars n={avgStars} />
                    <span style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR' }}>{campReviews.length} review{campReviews.length !== 1 ? 's' : ''}</span>
                    <span style={{ fontSize:12, color:C.accent, fontFamily:'Noto Sans KR', marginLeft:'auto' }}>View all →</span>
                  </div>
                  {campReviews.slice(0,2).map(r => <CampReviewCard key={r.id} review={r} user={user} onDelete={deleteReview} onEdit={setEditReview} />)}
                  {campReviews.length > 2 && (
                    <button onClick={() => setSelectedCamp(campName)}
                      style={{ width:'100%', marginTop:4, background:'transparent', border:`1px dashed ${C.border}`, borderRadius:8, padding:'7px', fontFamily:'Noto Sans KR', fontSize:12, color:C.sub, cursor:'pointer' }}>
                      +{campReviews.length-2} more
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {showModal && <CampReviewModal onClose={() => setShowModal(false)} addReview={addReview} user={user} />}
      {editReview && <CampReviewModal onClose={() => setEditReview(null)} editData={editReview} updateReview={updateReview} user={user} />}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const params = new URLSearchParams(window.location.search)
  const targetId = params.get('id')

  const [dark, setDark] = useState(() => localStorage.getItem('dark_mode') === 'true')
  const C = dark ? darkC : lightC

  const [user, setUser] = useState(null)
  const { jobs, loading, likedIds, toggleLike, addJob, updateJob, incrementView } = useJobs(user)
  const { reviews: campReviews, loading: campLoading, addReview, updateReview, deleteReview } = useCampReviews(user)
  const { isAdmin } = useAccess(user, jobs)
  const hasPhotoAccess = isAdmin || jobs.some(j => j.user_id === user?.id && j.photos?.length > 0)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [tab, setTab] = useState('reviews') // 'reviews' | 'qna' | 'best'
  const [region, setRegion]       = useState(params.get('region') || "All")
  const [type, setType]           = useState(params.get('type') || "All")
  const [sort, setSort]           = useState("Most liked")
  const [photoOnly, setPhotoOnly] = useState(false)
  const [myPostsOnly, setMyPostsOnly] = useState(false)
  const [authorFilter, setAuthorFilter] = useState('')
  const [selectedTags, setSelectedTags] = useState(params.get('tags') ? params.get('tags').split(',') : [])
  const [search, setSearch] = useState("")
  const [minHourly, setMinHourly] = useState(0)
  const [secondVisaOnly, setSecondVisaOnly] = useState(false)
  const [engLevel, setEngLevel]   = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showReviewTypePicker, setShowReviewTypePicker] = useState(false)
  const [showCampModal, setShowCampModal] = useState(false)
  const [editJob, setEditJob]     = useState(null)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [editNickname, setEditNickname] = useState(false)
  const [currentNickname, setCurrentNickname] = useState('')
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showSurvey, setShowSurvey] = useState(false)

  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bookmarked_ids') || '[]') } catch { return [] }
  })
  const [bookmarkOnly, setBookmarkOnly] = useState(false)
  const [viewMode, setViewMode] = useState('list')
  const [newJobsBanner, setNewJobsBanner] = useState([])

  // 새 후기 알림
  useEffect(() => {
    if (loading || !jobs.length) return
    const lastSeen = localStorage.getItem('last_seen_ts')
    localStorage.setItem('last_seen_ts', new Date().toISOString())
    if (!lastSeen) return
    const since = new Date(lastSeen)
    const bookmarkedRegions = bookmarkedIds.length
      ? [...new Set(jobs.filter(j => bookmarkedIds.includes(j.id)).map(j => j.region))]
      : null
    const fresh = jobs.filter(j => {
      const isNew = new Date(j.created_at) > since
      if (!isNew) return false
      return !bookmarkedRegions || bookmarkedRegions.includes(j.region)
    })
    if (!fresh.length) return
    setNewJobsBanner(fresh)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const regions = [...new Set(fresh.map(j => j.region))].join(', ')
      new Notification('🦘 WOHOL — New reviews', {
        body: `${fresh.length} new review${fresh.length !== 1 ? 's' : ''} in ${regions}!`,
        icon: '/og-image.png',
      })
    }
  }, [loading, jobs.length])

  const requestNotifPermission = async () => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') await Notification.requestPermission()
  }

  // 뱃지용 author stats (user_id 기준, 없으면 author 문자열 fallback)
  const authorStats = {}
  jobs.forEach(j => {
    const key = j.user_id || j.author || 'Anonymous'
    if (!authorStats[key]) authorStats[key] = { count:0, hasPhoto:false, totalLikes:0, author: j.author || 'Anonymous' }
    authorStats[key].count++
    if (j.photos?.length > 0) authorStats[key].hasPhoto = true
    authorStats[key].totalLikes += j.likes
  })

  useEffect(() => { localStorage.setItem('dark_mode', dark ? 'true' : 'false') }, [dark])

  useEffect(() => {
    if (!targetId || loading || !jobs.length) return
    const job = jobs.find(j => String(j.id) === targetId)
    if (!job) return
    document.title = `${job.title} (${job.region}) — WOHOL`
    const setMeta = (attr, val, prop = 'property') => {
      let el = document.querySelector(`meta[${prop}="${attr}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute(prop, attr); document.head.appendChild(el) }
      el.content = val
    }
    setMeta('og:title', `${job.title} — WOHOL`)
    setMeta('og:description', `${job.region} · $${job.hourly}/hr · "${job.review}"`)
    setMeta('twitter:title', `${job.title} — WOHOL`, 'name')
    setMeta('twitter:description', `${job.region} · $${job.hourly}/hr · "${job.review}"`, 'name')
  }, [targetId, jobs.length, loading])

  const toggleBookmark = (jobId) => {
    setBookmarkedIds(prev => {
      const next = prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
      localStorage.setItem('bookmarked_ids', JSON.stringify(next))
      if (!prev.includes(jobId)) requestNotifPermission()
      return next
    })
  }

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('nickname, survey_done').eq('id', userId).single()
    if (!data) setShowNicknameModal(true)
    else {
      setCurrentNickname(data.nickname || '')
      if (!data.survey_done) setShowSurvey(true)
    }
  }

  useEffect(() => {
    // OAuth 리다이렉트 후 URL에 에러 있으면 표시
    const hash = window.location.hash
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const errDesc = params.get('error_description') || params.get('error') || '알 수 없는 오류'
      alert('로그인 오류: ' + decodeURIComponent(errDesc.replace(/\+/g, ' ')))
      window.history.replaceState(null, '', window.location.pathname)
    }

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null; setUser(u); if (u) fetchProfile(u.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null; setUser(u)
      if (u) { fetchProfile(u.id); setShowLoginPrompt(false) } else setShowNicknameModal(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const p = new URLSearchParams()
    if (region !== 'All') p.set('region', region)
    if (type !== 'All') p.set('type', type)
    if (selectedTags.length) p.set('tags', selectedTags.join(','))
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [region, type, selectedTags])

  const signIn = () => {}
  const signOut = () => supabase.auth.signOut()

  const q = search.trim().toLowerCase()
  const filtered = jobs
    .filter(j => !q || j.title.toLowerCase().includes(q) || (j.company||'').toLowerCase().includes(q))
    .filter(j => region === "All"  || j.region.includes(region))
    .filter(j => type === "All"    || j.type === type)
    .filter(j => !photoOnly         || j.photos?.length > 0)
    .filter(j => !myPostsOnly       || j.user_id === user?.id)
    .filter(j => !authorFilter      || (j.author||'Anonymous') === authorFilter)
    .filter(j => selectedTags.length === 0 || j.tags?.some(t => selectedTags.includes(t)))
    .filter(j => j.hourly >= minHourly)
    .filter(j => !secondVisaOnly    || j.second_visa === true)
    .filter(j => !engLevel          || j.english_level === engLevel)
    .filter(j => !bookmarkOnly      || bookmarkedIds.includes(j.id))
    .sort((a,b) =>
      sort === "Most liked" ? b.likes - a.likes :
      sort === "Stars"      ? b.stars - a.stars :
      sort === "Hourly"     ? b.hourly - a.hourly :
      sort === "Most viewed"? (b.views||0) - (a.views||0) : b.id - a.id
    )

  const stats = !loading && jobs.length > 0 ? (() => {
    const avgHourly = Math.round(jobs.reduce((s,j) => s+j.hourly, 0) / jobs.length)
    const tagCount = {}
    jobs.forEach(j => j.tags?.forEach(t => { tagCount[t] = (tagCount[t]||0)+1 }))
    const topTag = Object.entries(tagCount).sort((a,b) => b[1]-a[1])[0]?.[0] || ''
    return { total: jobs.length, avgHourly, topTag }
  })() : null

  const chip = (active) => ({
    padding:'5px 12px', borderRadius:20, cursor:'pointer', fontSize:12, fontFamily:'Noto Sans KR', border:'1px solid', transition:'all 0.15s',
    background: active ? C.dark : 'transparent', borderColor: active ? C.dark : C.border, color: active ? C.gold : C.sub,
  })
  const selectStyle = { background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:'5px 10px', fontFamily:'Noto Sans KR', fontSize:12, color:C.sub, cursor:'pointer', outline:'none' }

  const handleWriteReview = () => {
    if (!user) { setShowLoginPrompt(true); return }
    setShowReviewTypePicker(true)
  }

  const cardProps = { likedIds, onLike:toggleLike, user, onEdit:setEditJob, onLoginPrompt:() => setShowLoginPrompt(true), onShare:() => user ? setShowModal(true) : setShowLoginPrompt(true), updateJob, incrementView, onAuthorClick:setAuthorFilter, bookmarkedIds, onBookmark:toggleBookmark, hasPhotoAccess, onWriteReview:handleWriteReview }

  return (
    <ThemeCtx.Provider value={C}>
      <div style={{ minHeight:'100vh', background:C.bg, transition:'background 0.3s' }}>

        {/* 헤더 */}
        <div style={{ borderBottom:`1px solid ${C.border}`, background: dark?'rgba(26,18,16,0.96)':'rgba(250,247,242,0.95)', backdropFilter:'blur(8px)', position:'sticky', top:0, zIndex:50, padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'background 0.3s' }}>
          <div>
            <div style={{ fontFamily:"'Jua','Noto Sans KR',sans-serif", fontSize:22, fontWeight:400, color:C.dark }}>🦘 WOHOL</div>
            <div style={{ fontSize:10, color:C.sub, fontFamily:'Noto Sans KR', marginTop:1 }}>WHV Jobs & Reviews in Australia</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={() => setDark(d => !d)} title={dark?'라이트 모드':'다크 모드'}
              style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:15, lineHeight:1 }}>
              {dark ? '☀️' : '🌙'}
            </button>
            {user ? (
              <>
                <img src={user.user_metadata?.avatar_url} alt="Profile" title="Edit nickname" onClick={() => setEditNickname(true)}
                  style={{ width:28, height:28, borderRadius:'50%', border:`2px solid ${C.accent}`, objectFit:'cover', cursor:'pointer' }}
                  onError={e => { e.target.style.display='none' }} />
                {isAdmin && (
                  <button onClick={() => setShowAdminPanel(true)}
                    style={{ background:'#FFF8E1', color:'#FF8F00', border:'1px solid #FFD54F', borderRadius:8, padding:'6px 10px', fontFamily:'Noto Sans KR', fontSize:12, cursor:'pointer' }}>
                    🛡 Admin
                  </button>
                )}
                <button onClick={() => setMyPostsOnly(v => !v)} style={{ background: myPostsOnly?C.dark:'transparent', color: myPostsOnly?C.gold:C.sub, border:`1px solid ${myPostsOnly?C.dark:C.border}`, borderRadius:8, padding:'6px 12px', fontFamily:'Noto Sans KR', fontSize:12, cursor:'pointer', transition:'all 0.15s' }}>My posts</button>
                <button onClick={signOut} style={{ background:'transparent', color:C.sub, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 12px', fontFamily:'Noto Sans KR', fontSize:12, cursor:'pointer' }}>Sign out</button>
              </>
            ) : (
              <GoogleSignInBtn width={200} />
            )}
            <button onClick={() => user ? setShowReviewTypePicker(true) : setShowLoginPrompt(true)}
              style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'8px 16px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              + Write a review
            </button>
          </div>
        </div>

        {/* 새 후기 알림 배너 */}
        {newJobsBanner.length > 0 && (
          <div style={{ background: dark?'#2A1E15':'#FFFBF2', borderBottom:`1px solid ${C.accent}40`, padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>🆕</span>
              <span style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.dark }}>
                <b>{newJobsBanner.length}</b> new review{newJobsBanner.length !== 1 ? 's' : ''} in <b>{[...new Set(newJobsBanner.map(j => j.region))].join(', ')}</b>!
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <button onClick={() => { setTab('reviews'); setNewJobsBanner([]) }} style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'5px 12px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:12, cursor:'pointer' }}>View now</button>
              <button onClick={() => setNewJobsBanner([])} style={{ background:'none', border:'none', fontSize:15, cursor:'pointer', color:C.sub, lineHeight:1 }}>✕</button>
            </div>
          </div>
        )}

        <div style={{ maxWidth:680, margin:'0 auto', padding:'0 16px 80px' }}>

          {/* 히어로 */}
          <div style={{ padding:'36px 0 24px' }}>
            <div style={{ fontSize:20, marginBottom:10, letterSpacing:'4px' }}>🇦🇺</div>
            <h1 style={{ fontFamily:"'Jua','Noto Sans KR',sans-serif", fontSize:'clamp(30px,7vw,48px)', fontWeight:400, color:C.dark, margin:'0 0 12px', lineHeight:1.2 }}>
              <span style={{ fontSize:'clamp(14px,3.5vw,20px)', color:C.sub, display:'block', marginBottom:6 }}>Real experiences from WHV workers</span>
              Australia Working<br />Holiday Reviews
            </h1>
            <p style={{ color:C.sub, fontSize:14, fontFamily:'Noto Sans KR', lineHeight:1.8, margin:0 }}>
              Hourly rates, pros &amp; cons, interview tips — from people who've actually been there.
            </p>
          </div>

          {/* 통계 배너 */}
          {stats && (
            <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
              {[{label:'Reviews', value:`${stats.total}`},{label:'Avg hourly', value:`$${stats.avgHourly}/hr`},{label:'Top category', value:stats.topTag}].map(({ label, value }) => (
                <div key={label} style={{ flex:1, minWidth:90, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'10px 14px', textAlign:'center' }}>
                  <div style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:C.dark, fontFamily:"'Jua',sans-serif" }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* 탭 네비게이션 */}
          <div style={{ display:'flex', borderBottom:`2px solid ${C.border}`, marginBottom:20 }}>
            {[['reviews','📋 Reviews'],['fifo','⛏️ FIFO'],['qna','💬 Q&A'],['best','🏆 Top Posts']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ flex:1, background:'none', border:'none', borderBottom: tab===key ? `2px solid ${C.accent}` : '2px solid transparent', marginBottom:-2, padding:'10px 0', cursor:'pointer', fontFamily:'Noto Sans KR', fontSize:13, fontWeight: tab===key ? 700 : 400, color: tab===key ? C.accent : C.sub, transition:'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* ─── 후기 탭 ─── */}
          {tab === 'reviews' && (
            <>
              <div style={{ marginBottom:12, position:'relative' }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:15, pointerEvents:'none' }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Job title, company..."
                  style={{ width:'100%', background:C.card, border:`1.5px solid ${search?C.accent:C.border}`, borderRadius:10, padding:'10px 14px 10px 36px', fontFamily:'Noto Sans KR', fontSize:14, color:C.dark, outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }} />
                {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, color:C.sub }}>✕</button>}
              </div>

              <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                <button onClick={() => setViewMode('list')} style={chip(viewMode==='list')}>📋 List</button>
                <button onClick={() => setViewMode('map')} style={chip(viewMode==='map')}>🗺️ Map</button>
              </div>

              <div style={{ marginBottom:20, display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {REGIONS.map(r => <button key={r} onClick={() => setRegion(r)} style={chip(region===r)}>{r}</button>)}
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {TAGS.map(t => <button key={t} onClick={() => setSelectedTags(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev,t])} style={chip(selectedTags.includes(t))}>{t}</button>)}
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                  {TYPES.map(t => <button key={t} onClick={() => setType(t)} style={chip(type===t)}>{t}</button>)}
                  <div style={{ width:1, height:16, background:C.border, margin:'0 2px' }} />
                  {[0,20,25,30,35].map(n => <button key={n} onClick={() => setMinHourly(n)} style={chip(minHourly===n)}>{n===0?'All rates':`$${n}+`}</button>)}
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                  <button onClick={() => setSecondVisaOnly(v=>!v)} style={{ ...chip(secondVisaOnly), borderColor: secondVisaOnly?'#4CAF50':C.border, background: secondVisaOnly?'#E8F5E9':'transparent', color: secondVisaOnly?'#2E7D32':C.sub }}>2nd visa</button>
                  {['','하','중','상'].map(lv => (
                    <button key={lv} onClick={() => setEngLevel(lv)}
                      style={{ ...chip(engLevel===lv), borderColor: engLevel===lv&&lv?(lv==='하'?'#4CAF50':lv==='중'?'#FFD54F':'#F44336'):engLevel===lv?C.dark:C.border, background: engLevel===lv&&lv?(lv==='하'?'#E8F5E9':lv==='중'?'#FFF8E1':'#FFEBEE'):engLevel===lv?C.dark:'transparent', color: engLevel===lv&&lv?(lv==='하'?'#2E7D32':lv==='중'?'#FF9800':'#C62828'):engLevel===lv?C.gold:C.sub }}>
                      {lv===''?'All English':`Eng ${ENG_LABELS[lv]??lv}`}
                    </button>
                  ))}
                  <button onClick={() => setPhotoOnly(p=>!p)} style={{ ...chip(photoOnly), borderColor: photoOnly?C.accent:C.border, background: photoOnly?'rgba(200,150,60,0.12)':'transparent', color: photoOnly?C.accent:C.sub }}>📷 Photos only</button>
                  <button onClick={() => setBookmarkOnly(v=>!v)} style={{ ...chip(bookmarkOnly), borderColor: bookmarkOnly?C.accent:C.border, background: bookmarkOnly?'rgba(200,150,60,0.12)':'transparent', color: bookmarkOnly?C.accent:C.sub }}>🔖 Bookmarks</button>
                  <div style={{ marginLeft:'auto' }}>
                    <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
                      {["Most liked","Stars","Hourly","Most viewed","Latest"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {authorFilter && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, background:'rgba(200,150,60,0.08)', border:`1px solid ${C.accent}`, borderRadius:10, padding:'8px 14px' }}>
                  <span style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.dark }}>Showing posts by <b>{authorFilter}</b> only</span>
                  <button onClick={() => setAuthorFilter('')} style={{ marginLeft:'auto', background:'none', border:'none', color:C.sub, cursor:'pointer', fontSize:13 }}>✕ Clear</button>
                </div>
              )}
              <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', marginBottom:16, opacity:0.7 }}>
                {loading ? 'Loading...' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
              </div>

              {viewMode === 'map' && (
                <div style={{ marginBottom:16 }}>
                  <Suspense fallback={<div style={{ height:360, display:'flex', alignItems:'center', justifyContent:'center', background:C.card, border:`1px solid ${C.border}`, borderRadius:12, fontFamily:'Noto Sans KR', fontSize:13, color:C.sub }}>Loading map...</div>}>
                    <LazyMapView jobs={filtered} onSelectRegion={r => setRegion(r)} selectedRegion={region} />
                  </Suspense>
                  <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', marginTop:8, textAlign:'center', opacity:0.7 }}>Click a pin to filter by state · click again to clear</div>
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {loading
                  ? Array.from({length:4}).map((_,i) => (
                      <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ height:18, width:'55%', background: dark?'#3D2E22':'#EDE8E0', borderRadius:6, marginBottom:8, animation:'pulse 1.4s ease-in-out infinite' }} />
                            <div style={{ height:13, width:'35%', background: dark?'#3D2E22':'#EDE8E0', borderRadius:6, animation:'pulse 1.4s ease-in-out infinite' }} />
                          </div>
                          <div style={{ width:56, height:48, background: dark?'#3D2E22':'#EDE8E0', borderRadius:10, animation:'pulse 1.4s ease-in-out infinite' }} />
                        </div>
                        <div style={{ height:40, background: dark?'#3D2E22':'#EDE8E0', borderRadius:8, animation:'pulse 1.4s ease-in-out infinite' }} />
                      </div>
                    ))
                  : filtered.map(job => (
                      <JobCard key={job.id} job={job} liked={likedIds.includes(job.id)} {...cardProps}
                        defaultOpen={targetId===String(job.id)}
                        authorBadges={getAuthorBadges(job.user_id || job.author || 'Anonymous', authorStats)} />
                    ))
                }
              </div>
              {!loading && filtered.length === 0 && (
                <div style={{ textAlign:'center', padding:'60px 20px', color:C.sub, fontFamily:'Noto Sans KR', fontSize:14 }}>
                  {bookmarkOnly ? 'No bookmarked reviews.' : 'No reviews yet. Be the first to share!'}
                </div>
              )}
            </>
          )}

          {/* ─── FIFO 탭 ─── */}
          {tab === 'fifo' && (
            <FIFOTab user={user} onLoginPrompt={() => setShowLoginPrompt(true)}
              reviews={campReviews} loading={campLoading} addReview={addReview} updateReview={updateReview} deleteReview={deleteReview} />
          )}

          {/* ─── Q&A 탭 ─── */}
          {tab === 'qna' && (
            <QuestionBoard user={user} onLoginPrompt={() => setShowLoginPrompt(true)} />
          )}

          {/* ─── 베스트 탭 ─── */}
          {tab === 'best' && (
            <BestPosts jobs={jobs} {...cardProps} authorStats={authorStats} />
          )}
        </div>

        {showNicknameModal && user && (
          <NicknameModal user={user} onSave={(n) => { setCurrentNickname(n); setShowNicknameModal(false); setShowSurvey(true) }} />
        )}
        {showSurvey && user && !showNicknameModal && (
          <SurveyModal user={user} onDone={() => setShowSurvey(false)} />
        )}
        {editNickname && user && (
          <NicknameModal user={user} isEdit currentNickname={currentNickname}
            onSave={(n) => { setCurrentNickname(n); setEditNickname(false) }}
            onClose={() => setEditNickname(false)} />
        )}
        {showLoginPrompt && <LoginPromptModal onClose={() => setShowLoginPrompt(false)} onLogin={signIn} />}
        {showReviewTypePicker && (
          <ReviewTypeModal onClose={() => setShowReviewTypePicker(false)} onSelect={type => {
            setShowReviewTypePicker(false)
            if (type === 'fifo') setShowCampModal(true)
            else setShowModal(true)
          }} />
        )}
        {showModal && <SubmitModal onClose={() => setShowModal(false)} addJob={addJob} updateJob={updateJob} user={user} />}
        {showCampModal && <CampReviewModal onClose={() => setShowCampModal(false)} addReview={addReview} user={user} />}
        {editJob && <SubmitModal onClose={() => setEditJob(null)} addJob={addJob} updateJob={updateJob} editData={editJob} user={user} />}
        {showAdminPanel && isAdmin && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
      </div>
    </ThemeCtx.Provider>
  )
}
