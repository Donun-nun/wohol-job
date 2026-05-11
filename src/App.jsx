import { useState, useEffect, useRef, createContext, useContext, lazy, Suspense } from 'react'
import { useJobs } from './useJobs'
import { useQuestions } from './useQuestions'
import { useCampReviews } from './useCampReviews'
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
        지도 로드 실패. 터미널에서 <code style={{ margin:'0 6px' }}>npm install react-leaflet leaflet</code> 후 재시작하세요.
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
  if (s.count >= 5) badges.push({ emoji: '🏆', label: '베테랑 (후기 5개+)' })
  else if (s.count >= 3) badges.push({ emoji: '⭐', label: '경험자 (후기 3개+)' })
  if (s.hasPhoto) badges.push({ emoji: '📸', label: '사진 후기 작성자' })
  if (s.totalLikes >= 10) badges.push({ emoji: '🔥', label: '인기 작성자' })
  return badges
}

// ─── NicknameModal ────────────────────────────────────────────────────────────
function NicknameModal({ user, onSave, onClose, isEdit, currentNickname }) {
  const C = useC()
  const [nickname, setNickname] = useState(isEdit ? (currentNickname || '') : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const trimmed = nickname.trim()
    if (!trimmed) { setError('닉네임을 입력해주세요.'); return }
    if (trimmed.length < 2) { setError('2자 이상 입력해주세요.'); return }
    if (trimmed.length > 20) { setError('20자 이하로 입력해주세요.'); return }
    setSaving(true)
    const { error: err } = isEdit
      ? await supabase.from('profiles').update({ nickname: trimmed }).eq('id', user.id)
      : await supabase.from('profiles').insert({ id: user.id, nickname: trimmed })
    if (err) {
      setError(err.code === '23505' ? '이미 사용 중인 닉네임이에요.' : '저장 실패. 다시 시도해주세요.')
      setSaving(false)
    } else { onSave(trimmed) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:150, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:36, width:'100%', maxWidth:380, textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize:36, marginBottom:14 }}>👤</div>
        <div style={{ fontFamily:"'Noto Sans KR'", fontSize:20, fontWeight:700, color:C.dark, marginBottom:8 }}>{isEdit ? '닉네임 수정' : '닉네임을 정해줘요'}</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.sub, marginBottom:24, lineHeight:1.7 }}>
          모든 글에 이 닉네임이 표시돼요.<br />수정하면 기존 글도 자동 반영돼요.
        </div>
        <input value={nickname} onChange={e => { setNickname(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="예: 퍼스워홀러, 광산킹, Kenny" maxLength={20}
          style={{ width:'100%', background:C.fill, border:`1.5px solid ${error ? '#E05050' : C.border}`, borderRadius:8, padding:'11px 14px', color:C.dark, fontSize:14, fontFamily:'Noto Sans KR', outline:'none', boxSizing:'border-box', marginBottom:6 }} />
        {error && <div style={{ fontSize:12, color:'#E05050', fontFamily:'Noto Sans KR', marginBottom:10 }}>{error}</div>}
        <button onClick={handleSave} disabled={saving}
          style={{ width:'100%', background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'13px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, marginTop:8 }}>
          {saving ? '저장 중...' : (isEdit ? '닉네임 변경하기' : '닉네임 저장하기')}
        </button>
        {isEdit && onClose && (
          <button onClick={onClose} style={{ marginTop:10, width:'100%', background:'transparent', color:C.sub, border:'none', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer' }}>취소</button>
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
        <div style={{ fontFamily:"'Noto Sans KR'", fontSize:20, fontWeight:700, color:C.dark, marginBottom:8 }}>로그인이 필요해요</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:C.sub, lineHeight:1.7, marginBottom:28 }}>구글 계정으로 로그인해주세요.</div>
        <button onClick={onLogin} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'13px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer', marginBottom:10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          구글로 로그인하기
        </button>
        <button onClick={onClose} style={{ width:'100%', background:'transparent', color:C.sub, border:'none', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer' }}>취소</button>
      </div>
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────
const REGIONS = ["전체", "WA", "NSW", "VIC", "QLD", "SA", "NT", "TAS", "ACT"]
const TYPES   = ["전체", "Casual", "Part-time", "Full-time"]
const TAGS    = ['광산','카페','농장','주방','건설','서비스','물류','기타']
const ENG_LABELS = { 하:'下', 중:'中', 상:'上' }
const EMPTY_FORM = { title:'', company:'', region:'WA', location:'', type:'Casual', hourly:'', shift:'', review:'', pros:'', cons:'', daily_life:'', interview_tips:'', stars:4, author:'', tags:[], second_visa:null, english_level:'' }

const CLOUDINARY_CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

// 지역별 오픈채팅 링크 — 실제 링크 추가 시 여기에 입력
const OPENCHAT_LINKS = {
  WA: '', QLD: '', NSW: '', VIC: '', SA: '', NT: '', TAS: '', ACT: '',
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff/60)}분 전`
  if (diff < 86400) return `${Math.floor(diff/3600)}시간 전`
  if (diff < 2592000) return `${Math.floor(diff/86400)}일 전`
  return `${Math.floor(diff/2592000)}개월 전`
}

async function uploadPhoto(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method:'POST', body:formData })
  return (await res.json()).secure_url
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
                  <button onClick={saveCaption} style={{ background:C.accent, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer', fontWeight:700 }}>저장</button>
                  <button onClick={e => { e.stopPropagation(); setEditing(false) }} style={{ background:'rgba(255,255,255,0.1)', color:'#ccc', border:'none', borderRadius:8, padding:'7px 10px', fontFamily:'Noto Sans KR', fontSize:12, cursor:'pointer' }}>취소</button>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color: photos[active].caption ? '#ddd' : 'rgba(255,255,255,0.35)', fontFamily:'Noto Sans KR', fontSize:13, flex:1 }}>
                    {photos[active].caption || (isOwner ? '+ 설명 추가' : '')}
                  </span>
                  {isOwner && (
                    <button onClick={e => { e.stopPropagation(); setEditing(true) }}
                      style={{ background:'rgba(255,255,255,0.1)', color:'#ccc', border:'1px solid rgba(255,255,255,0.2)', borderRadius:6, padding:'4px 10px', fontFamily:'Noto Sans KR', fontSize:11, cursor:'pointer' }}>
                      ✏️ 수정
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
    } catch { alert('사진 업로드 실패. 다시 시도해주세요.') }
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
                placeholder="사진 설명" maxLength={60}
                style={{ flex:1, background:C.fill, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 10px', fontSize:12, fontFamily:'Noto Sans KR', color:C.dark, outline:'none', alignSelf:'center' }} />
            </div>
          ))}
        </div>
      )}
      <label style={{ display:'inline-block', cursor:'pointer', background: uploading ? 'rgba(0,0,0,0.03)' : 'rgba(200,150,60,0.07)', border:`1.5px dashed ${C.accent}`, borderRadius:10, padding:'10px 20px', fontFamily:'Noto Sans KR', fontSize:13, color:C.accent }}>
        {uploading ? '업로드 중...' : '📷 사진 선택하기'}
        <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ display:'none' }} disabled={uploading} />
      </label>
      <div style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', marginTop:6 }}>여러 장 동시 선택 가능</div>
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
    if (!form.title || !form.hourly || !form.review) { alert('직업명, 시급, 한줄평은 필수예요!'); return }
    setSubmitting(true)
    const { tags, ...formRest } = form
    const payload = {
      ...formRest, hourly: Number(form.hourly),
      photos: JSON.stringify(photos.map(p => ({ url:p.url, caption:p.caption||'' }))),
      tag: tags.length ? JSON.stringify(tags) : null,
      ...(!isEdit && user ? { user_id: user.id } : {}),
    }
    const success = isEdit ? await updateJob(editData.id, payload) : await addJob(payload)
    setSubmitting(false)
    if (success) setDone(true)
    else alert('저장 실패. 다시 시도해주세요.')
  }

  if (done) return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:40, width:'100%', maxWidth:400, textAlign:'center' }}>
        <div style={{ fontSize:44, marginBottom:16 }}>{isEdit ? '✅' : '🎉'}</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:22, fontWeight:700, color:C.dark, marginBottom:8 }}>{isEdit ? '수정 완료!' : '공유해줘서 고마워요!'}</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:C.sub, lineHeight:1.7, marginBottom:24 }}>{isEdit ? '변경사항이 저장됐어요.' : '다음 워홀러에게 큰 도움이 될 거예요.'}</div>
        <button onClick={onClose} style={{ background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'12px 28px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer' }}>닫기</button>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:28, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:20, fontWeight:700, color:C.dark }}>{isEdit ? '후기 수정하기' : '내 경험 공유하기'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#bbb' }}>✕</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div><label style={labelStyle}>직업명 *</label><input style={inputStyle} placeholder="예: Service Attendant" value={form.title} onChange={e => set('title', e.target.value)} /></div>
          <div><label style={labelStyle}>고용주/회사</label><input style={inputStyle} placeholder="예: Sodexo" value={form.company} onChange={e => set('company', e.target.value)} /></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div><label style={labelStyle}>주(State) *</label>
            <select style={inputStyle} value={form.region} onChange={e => set('region', e.target.value)}>
              {['WA','NSW','VIC','QLD','SA','NT','TAS','ACT'].map(r => <option key={r}>{r}</option>)}
            </select></div>
          <div><label style={labelStyle}>고용 형태 *</label>
            <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
              {['Casual','Part-time','Full-time'].map(t => <option key={t}>{t}</option>)}
            </select></div>
        </div>
        <div style={{ marginBottom:12 }}><label style={labelStyle}>세부 위치 (예: 퍼스 노스, 번다버그)</label><input style={inputStyle} placeholder="도시 또는 지역명" value={form.location} onChange={e => set('location', e.target.value)} /></div>
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>직종 분류 (선택 — 안 하면 자동 분류)</label>
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
          <div><label style={labelStyle}>시급 (AUD) *</label><input style={inputStyle} type="number" placeholder="예: 32" value={form.hourly} onChange={e => set('hourly', e.target.value)} /></div>
          <div><label style={labelStyle}>주요 시프트</label><input style={inputStyle} placeholder="예: 12h 야간" value={form.shift} onChange={e => set('shift', e.target.value)} /></div>
        </div>
        <div style={{ marginBottom:12 }}><label style={labelStyle}>한줄평 * — 이 직업을 한 문장으로!</label><input style={inputStyle} placeholder="예: 몸은 힘들지만 통장이 웃는다" value={form.review} onChange={e => set('review', e.target.value)} /></div>
        <div style={{ marginBottom:12 }}><label style={labelStyle}>장점 (줄바꿈으로 구분)</label><textarea style={{ ...inputStyle, height:80, resize:'vertical' }} placeholder="시급 높음&#10;숙식 제공&#10;저축 빠름" value={form.pros} onChange={e => set('pros', e.target.value)} /></div>
        <div style={{ marginBottom:12 }}><label style={labelStyle}>단점 (줄바꿈으로 구분)</label><textarea style={{ ...inputStyle, height:80, resize:'vertical' }} placeholder="소셜 생활 제로&#10;체력 소모 큼" value={form.cons} onChange={e => set('cons', e.target.value)} /></div>
        <div style={{ marginBottom:12 }}><label style={labelStyle}>하루 일과 — A day in the life</label><textarea style={{ ...inputStyle, height:100, resize:'vertical' }} placeholder="예: 6시 기상 → 7시 브렉퍼스트 룸 세팅 → ..." value={form.daily_life} onChange={e => set('daily_life', e.target.value)} /></div>
        <div style={{ marginBottom:12 }}><label style={labelStyle}>면접 꿀팁 (선택)</label><textarea style={{ ...inputStyle, height:80, resize:'vertical' }} placeholder="예: 경력 없어도 됨, 복장은 캐주얼 OK" value={form.interview_tips} onChange={e => set('interview_tips', e.target.value)} /></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div>
            <label style={labelStyle}>2nd 비자 가능 여부</label>
            <div style={{ display:'flex', gap:6 }}>
              {[['모름',null],['가능 ✓',true],['불가 ✗',false]].map(([label,val]) => (
                <button key={label} type="button" onClick={() => set('second_visa', form.second_visa===val ? null : val)}
                  style={{ flex:1, padding:'8px 4px', borderRadius:8, cursor:'pointer', fontSize:12, fontFamily:'Noto Sans KR', border:'1.5px solid', transition:'all 0.15s',
                    background: form.second_visa===val ? (val===true?'#E8F5E9':val===false?'#FFEBEE':C.fill) : 'transparent',
                    borderColor: form.second_visa===val ? (val===true?'#4CAF50':val===false?'#E57373':C.accent) : C.border,
                    color: form.second_visa===val ? (val===true?'#2E7D32':val===false?'#C62828':C.dark) : C.sub }}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>영어 필요도</label>
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
          <label style={labelStyle}>추천 점수</label>
          <div style={{ display:'flex', gap:8 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => set('stars', n)} style={{ background: n<=form.stars?'rgba(245,166,35,0.12)':'transparent', border:`1.5px solid ${n<=form.stars?'#F5A623':C.border}`, borderRadius:8, padding:'8px 14px', cursor:'pointer', color: n<=form.stars?'#F5A623':C.border, fontSize:18 }}>★</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:20 }}><label style={labelStyle}>📷 현장 사진 (선택)</label><PhotoUploader photos={photos} setPhotos={setPhotos} /></div>
        <div style={{ background:'#FFF8EC', border:'1px solid #F0D898', borderRadius:8, padding:'10px 14px', marginBottom:12, fontFamily:'Noto Sans KR', fontSize:12, color:'#7A5A10', lineHeight:1.7 }}>
          ⚠️ 허위 사실이나 과장된 정보는 다른 워홀러에게 피해를 줄 수 있어요.
        </div>
        <button onClick={handleSubmit} disabled={submitting} style={{ width:'100%', background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'14px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:15, cursor: submitting?'default':'pointer', opacity: submitting?0.7:1 }}>
          {submitting ? '저장 중...' : (isEdit ? '수정 완료' : '공유하기')}
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
    setAnswers(data.map(a => ({ ...a, nickname: nickMap[a.user_id] || '익명' })))
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
            {isRequest ? '📝 후기 요청' : '💬 질문'}
          </span>
          {q.region && <span style={{ fontSize:10, background:C.fill, color:C.sub, border:`1px solid ${C.border}`, borderRadius:10, padding:'1px 7px', fontFamily:'Noto Sans KR' }}>{q.region}</span>}
          {q.tag && !isRequest && <span style={{ fontSize:10, background:C.fill, color:C.sub, border:`1px solid ${C.border}`, borderRadius:10, padding:'1px 7px', fontFamily:'Noto Sans KR' }}>{q.tag}</span>}
        </div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:C.dark, lineHeight:1.65, marginBottom:10 }}>{q.content}</div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR' }}>{q.nickname}</span>
          <span style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR' }}>· {timeAgo(q.created_at)}</span>
          <span style={{ fontSize:11, color: open ? C.accent : C.sub, fontFamily:'Noto Sans KR', marginLeft:'auto' }}>
            💬 {open ? answers.length : (q.answer_count || 0)}개 · {open ? '접기 ∧' : '답변 보기 ∨'}
          </span>
          {user?.id === q.user_id && (
            <button onClick={e => { e.stopPropagation(); onDelete(q.id) }}
              style={{ background:'none', border:'none', color:C.sub, fontSize:11, cursor:'pointer', fontFamily:'Noto Sans KR', padding:'0 4px' }}>삭제</button>
          )}
        </div>
      </div>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{ borderTop:`1px solid ${C.border}`, padding:'14px 16px', background:C.bg }}>
          {answers.length === 0 && <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', marginBottom:12, opacity:0.6 }}>아직 답변이 없어요. 첫 답변을 달아보세요!</div>}
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
                placeholder="답변 달기..."
                style={{ flex:1, background:C.fill, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, fontFamily:'Noto Sans KR', color:C.dark, outline:'none' }} />
              <button onClick={postAnswer} disabled={posting || !answerText.trim()}
                style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'8px 14px', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer', opacity:(!answerText.trim()||posting)?0.5:1 }}>등록</button>
            </div>
          ) : (
            <button onClick={onLoginPrompt} style={{ fontSize:12, color:C.accent, fontFamily:'Noto Sans KR', background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 14px', cursor:'pointer', width:'100%' }}>
              로그인하면 답변할 수 있어요
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
        <div style={{ fontSize:13, fontWeight:700, color:C.dark, fontFamily:'Noto Sans KR', marginBottom:10 }}>💬 지역별 카카오 오픈채팅</div>
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
        <div style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', marginTop:8, opacity:0.7 }}>링크는 순차적으로 추가될 예정이에요</div>
      </div>

      {/* 헤더 */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR' }}>{filtered.length}개의 글</div>
        <button onClick={() => user ? setShowForm(v => !v) : onLoginPrompt()}
          style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'7px 16px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          + 글쓰기
        </button>
      </div>

      {/* 글쓰기 폼 */}
      {showForm && (
        <div style={{ background:C.card, border:`1.5px solid ${C.accent}`, borderRadius:12, padding:'16px', marginBottom:16 }}>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            {[['question','💬 질문'],['request','📝 후기 요청']].map(([type, label]) => (
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
              <option value="">지역 선택 (선택)</option>
              {['WA','NSW','VIC','QLD','SA','NT','TAS','ACT'].map(r => <option key={r}>{r}</option>)}
            </select>
            {formType === 'question' && (
              <select value={formTag} onChange={e => setFormTag(e.target.value)} style={{ ...selectStyle, flex:1 }}>
                <option value="">직종 선택 (선택)</option>
                {TAGS.map(t => <option key={t}>{t}</option>)}
              </select>
            )}
          </div>
          <textarea value={formContent} onChange={e => setFormContent(e.target.value)}
            placeholder={formType === 'request' ? '어떤 직종/회사의 후기가 필요한가요? (예: 퍼스 BWS 편의점 후기 있으신 분?)' : '궁금한 점을 자유롭게 질문해요. (예: 농장일 한국어만 해도 되나요?)'}
            style={{ width:'100%', background:C.fill, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'Noto Sans KR', color:C.dark, outline:'none', resize:'vertical', minHeight:80, boxSizing:'border-box' }} />
          <div style={{ display:'flex', gap:8, marginTop:10, justifyContent:'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 14px', fontFamily:'Noto Sans KR', fontSize:13, color:C.sub, cursor:'pointer' }}>취소</button>
            <button onClick={handleSubmit} disabled={submitting || !formContent.trim()}
              style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'7px 16px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer', opacity:(!formContent.trim()||submitting)?0.5:1 }}>
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* 지역 필터 */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
        <button onClick={() => setFilterRegion('')} style={chip(!filterRegion)}>전체</button>
        {['WA','NSW','VIC','QLD','SA','NT','TAS','ACT'].map(r => (
          <button key={r} onClick={() => setFilterRegion(filterRegion === r ? '' : r)} style={chip(filterRegion === r)}>{r}</button>
        ))}
      </div>

      {/* 글 목록 */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'40px', color:C.sub, fontFamily:'Noto Sans KR', fontSize:13 }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:C.sub, fontFamily:'Noto Sans KR', fontSize:14 }}>
          아직 글이 없어요.<br />첫 질문이나 후기 요청을 올려보세요!
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
    <div style={{ textAlign:'center', padding:'60px 20px', color:C.sub, fontFamily:'Noto Sans KR', fontSize:14 }}>후기가 아직 없어요.</div>
  )

  return (
    <div>
      <div style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.sub, marginBottom:16, lineHeight:1.6 }}>
        이달 좋아요를 가장 많이 받은 후기예요. {best.length < 3 ? '(전체 기간 기준)' : ''}
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
              authorBadges={getAuthorBadges(job.author || '익명', authorStats)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── JobCard ──────────────────────────────────────────────────────────────────
function JobCard({ job, liked, onLike, isBookmarked, onBookmark, user, onEdit, onLoginPrompt, onShare, defaultOpen, updateJob, incrementView, onAuthorClick, authorBadges }) {
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
      try { await navigator.share({ title: `${job.title} — 호주잡`, text: `"${job.review}"`, url }) } catch {}
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
    setComments(commentsData.map(c => ({ ...c, nickname: nickMap[c.user_id] || '익명', _localLikes: 0 })))
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

  return (
    <div onClick={() => setOpen(o => !o)}
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

      {hasPhotos && <div style={{ paddingTop:14 }}><PhotoGallery photos={job.photos} isOwner={isOwner} onCaptionSave={handleCaptionSave} /></div>}

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
              {job.english_level && <span style={{ fontSize:10, background: job.english_level==='하'?'#E8F5E9':job.english_level==='중'?'#FFF8E1':'#FFEBEE', color: job.english_level==='하'?'#2E7D32':job.english_level==='중'?'#FF9800':'#C62828', border:`1px solid ${job.english_level==='하'?'#A5D6A7':job.english_level==='중'?'#FFD54F':'#EF9A9A'}`, borderRadius:10, padding:'1px 7px', fontFamily:'Noto Sans KR' }}>영어 {ENG_LABELS[job.english_level]}</span>}
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
                수정
              </button>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {/* 뱃지 */}
            {authorBadges?.map(b => (
              <span key={b.emoji} title={b.label} style={{ fontSize:13, cursor:'default' }}>{b.emoji}</span>
            ))}
            <div onClick={e => { e.stopPropagation(); onAuthorClick(job.author || '익명') }}
              style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', opacity:0.8, cursor:'pointer', textDecoration:'underline', textDecorationStyle:'dotted', textUnderlineOffset:2 }}>
              {job.author || '익명'}
            </div>
            {/* 도움됐어요 (구 좋아요) */}
            <button onClick={e => { e.stopPropagation(); onLike(job.id) }}
              style={{ display:'flex', alignItems:'center', gap:4, background: liked ? 'rgba(200,150,60,0.1)' : 'transparent', border:`1px solid ${liked ? C.accent : C.border}`, borderRadius:20, padding:'4px 10px', cursor:'pointer', fontFamily:'Noto Sans KR', fontSize:12, color: liked ? C.accent : C.sub, transition:'all 0.15s' }}>
              <span>{liked ? '👍' : '👍'}</span>
              <span style={{ fontSize:11 }}>{liked ? '도움됐어요' : '도움돼요'} {job.likes > 0 ? job.likes : ''}</span>
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:13, color:C.sub, opacity:0.7 }}>
              <span>💬</span><span style={{ fontSize:11 }}>{comments.length}</span>
            </div>
            {job.views > 0 && <div style={{ display:'flex', alignItems:'center', gap:2, fontSize:11, color:C.sub, opacity:0.6 }}><span>👁</span><span>{job.views}</span></div>}
            <button onClick={shareJob}
              style={{ display:'flex', alignItems:'center', gap:4, background: copied?'rgba(200,150,60,0.1)':'transparent', border:`1px solid ${copied?C.accent:C.border}`, borderRadius:20, padding:'4px 10px', cursor:'pointer', fontFamily:'Noto Sans KR', fontSize:12, color: copied?C.accent:C.sub, transition:'all 0.15s' }}>
              {copied ? '✓ 복사됨' : '🔗 공유'}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:'16px 20px 20px', background:C.bg }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom: (job.daily_life||job.interview_tips) ? 10 : 0 }}>
            <div style={{ background:'#F3FAF3', borderRadius:10, padding:14 }}>
              <div style={{ fontSize:11, color:'#3A7A3A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:8 }}>👍 장점</div>
              {job.pros.map((p,i) => <div key={i} style={{ fontSize:13, color:'#2A5A2A', fontFamily:'Noto Sans KR', marginBottom:4, lineHeight:1.5 }}>· {p}</div>)}
            </div>
            <div style={{ background:'#FAF3F3', borderRadius:10, padding:14 }}>
              <div style={{ fontSize:11, color:'#8A3A3A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:8 }}>👎 단점</div>
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
              <div style={{ fontSize:11, color:'#3A4A8A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:8 }}>💡 면접 꿀팁</div>
              <div style={{ fontSize:13, color:'#2A3060', fontFamily:'Noto Sans KR', lineHeight:1.8, whiteSpace:'pre-line' }}>{job.interview_tips}</div>
            </div>
          )}

          {/* 댓글 */}
          <div style={{ marginTop:14, borderTop:`1px solid ${C.border}`, paddingTop:14 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:10 }}>댓글 {comments.length > 0 ? comments.length : ''}</div>
            {topLevel.length === 0 && <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', opacity:0.6, marginBottom:10 }}>첫 댓글을 달아보세요</div>}

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
                        style={{ background:'none', border:'none', color:C.accent, fontSize:11, cursor:'pointer', padding:'0 4px', fontFamily:'Noto Sans KR' }}>답글</button>
                    )}
                    {user?.id === c.user_id && (
                      <button onClick={e => deleteComment(e, c.id)} style={{ background:'none', border:'none', color:C.sub, fontSize:11, cursor:'pointer', padding:'0 4px', fontFamily:'Noto Sans KR' }}>삭제</button>
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
                        <button onClick={e => deleteComment(e, r.id)} style={{ background:'none', border:'none', color:C.sub, fontSize:11, cursor:'pointer', padding:'0 4px', fontFamily:'Noto Sans KR' }}>삭제</button>
                      )}
                    </div>
                  </div>
                ))}

                {replyTo?.id === c.id && (
                  <div style={{ display:'flex', gap:8, marginTop:8, paddingLeft:16 }}>
                    <input autoFocus value={replyText} onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); postReply(e) } }}
                      placeholder={`@${replyTo.nickname}에게 답글...`}
                      style={{ flex:1, background:C.fill, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 11px', fontSize:13, fontFamily:'Noto Sans KR', color:C.dark, outline:'none' }} />
                    <button onClick={postReply} disabled={posting||!replyText.trim()}
                      style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'7px 12px', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer', opacity:(!replyText.trim()||posting)?0.5:1 }}>등록</button>
                    <button onClick={e => { e.stopPropagation(); setReplyTo(null) }}
                      style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', fontFamily:'Noto Sans KR', fontSize:12, color:C.sub, cursor:'pointer' }}>취소</button>
                  </div>
                )}
              </div>
            ))}

            {user ? (
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); postComment(e) } }}
                  placeholder="댓글 달기..."
                  style={{ flex:1, background:C.fill, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, fontFamily:'Noto Sans KR', color:C.dark, outline:'none' }} />
                <button onClick={postComment} disabled={posting||!commentText.trim()}
                  style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'8px 14px', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer', opacity:(!commentText.trim()||posting)?0.5:1 }}>등록</button>
              </div>
            ) : (
              <button onClick={onLoginPrompt} style={{ fontSize:12, color:C.accent, fontFamily:'Noto Sans KR', background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 14px', cursor:'pointer', width:'100%' }}>
                로그인하면 댓글을 달 수 있어요
              </button>
            )}
          </div>

          {/* 경험 공유 유도 CTA */}
          <div style={{ marginTop:14, background:`linear-gradient(135deg, rgba(200,150,60,0.06), rgba(44,26,0,0.03))`, border:`1px solid rgba(200,150,60,0.25)`, borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }} onClick={e => e.stopPropagation()}>
            <div>
              <div style={{ fontFamily:'Noto Sans KR', fontSize:13, fontWeight:700, color:C.dark }}>비슷한 경험 있으세요?</div>
              <div style={{ fontFamily:'Noto Sans KR', fontSize:11, color:C.sub, marginTop:2 }}>후기 하나가 다음 워홀러에게 큰 도움이 돼요</div>
            </div>
            <button onClick={() => onShare()} style={{ flexShrink:0, background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'8px 14px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
              경험 공유하기 →
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
        <div style={{ fontFamily:'Noto Sans KR', fontSize:18, fontWeight:700, color:C.dark, marginBottom:6 }}>어떤 후기인가요?</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.sub, marginBottom:24 }}>후기 유형을 선택해주세요</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => onSelect('general')}
            style={{ background:C.fill, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'16px', cursor:'pointer', textAlign:'left', transition:'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor=C.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor=C.border}>
            <div style={{ fontFamily:'Noto Sans KR', fontSize:15, fontWeight:700, color:C.dark, marginBottom:4 }}>📋 일반 후기</div>
            <div style={{ fontFamily:'Noto Sans KR', fontSize:12, color:C.sub }}>카페, 농장, 건설 등 모든 직종</div>
          </button>
          <button onClick={() => onSelect('fifo')}
            style={{ background:'rgba(200,150,60,0.06)', border:`1.5px solid rgba(200,150,60,0.3)`, borderRadius:12, padding:'16px', cursor:'pointer', textAlign:'left', transition:'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor=C.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor='rgba(200,150,60,0.3)'}>
            <div style={{ fontFamily:'Noto Sans KR', fontSize:15, fontWeight:700, color:C.dark, marginBottom:4 }}>⛏️ 광산 스윙 후기</div>
            <div style={{ fontFamily:'Noto Sans KR', fontSize:12, color:C.sub }}>FIFO 캠프 서비스 어텐던트 전용</div>
          </button>
        </div>
        <button onClick={onClose} style={{ marginTop:16, background:'transparent', border:'none', color:C.sub, fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer' }}>취소</button>
      </div>
    </div>
  )
}

// ─── FIFO 상수 ────────────────────────────────────────────────────────────────
const KNOWN_CAMPS = ['Punurrunha','Hope Downs 1','Hope Downs 4','Newman Camp','Yandi','Mining Area C','Cloudbreak','Christmas Creek','Karara','Sino Iron','Yandicoogina','Tom Price','Paraburdoo','Pannawonica','South Flank','Jimblebar','Wheelarra']
const CATERING_COS = ['Sodexo','Compass Group','Downer','ISS','Broadspectrum','기타']
const CAMP_POSITIONS = ['Kitchen Hand','Housekeeping','Utility','Bar','Retail','기타']

// ─── CampReviewModal ──────────────────────────────────────────────────────────
function CampReviewModal({ onClose, addReview, user }) {
  const C = useC()
  const EMPTY = { camp_name:'', catering_company:'', position:'Kitchen Hand', position_custom:'', review:'', pros:'', cons:'', daily_life:'', food_satisfaction:null, accommodation_satisfaction:null, work_satisfaction:null, swing_satisfaction:null }
  const [form, setForm] = useState(EMPTY)
  const [campInput, setCampInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const suggestions = campInput.length > 0
    ? KNOWN_CAMPS.filter(c => c.toLowerCase().includes(campInput.toLowerCase()))
    : KNOWN_CAMPS

  const handleSubmit = async () => {
    if (!form.camp_name || !form.review) { alert('캠프 이름과 한줄평은 필수예요!'); return }
    setSubmitting(true)
    const finalPosition = form.position === '기타' ? (form.position_custom || '기타') : form.position
    const { position_custom, ...rest } = form
    const ok = await addReview({ ...rest, position: finalPosition })
    setSubmitting(false)
    if (ok) setDone(true)
    else alert('저장 실패. 다시 시도해주세요.')
  }

  const inputStyle = { width:'100%', background:C.fill, border:`1.5px solid ${C.border}`, borderRadius:8, padding:'10px 12px', color:C.dark, fontSize:14, fontFamily:'Noto Sans KR', outline:'none', boxSizing:'border-box' }
  const labelStyle = { fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', marginBottom:6, display:'block' }

  if (done) return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:40, width:'100%', maxWidth:400, textAlign:'center' }}>
        <div style={{ fontSize:44, marginBottom:16 }}>⛏️</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:22, fontWeight:700, color:C.dark, marginBottom:8 }}>후기 등록 완료!</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:C.sub, lineHeight:1.7, marginBottom:24 }}>다음 워홀러에게 큰 도움이 될 거예요.</div>
        <button onClick={onClose} style={{ background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'12px 28px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer' }}>닫기</button>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:28, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:20, fontWeight:700, color:C.dark }}>⛏️ FIFO 캠프 후기</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#bbb' }}>✕</button>
        </div>

        {/* 캠프 이름 */}
        <div style={{ marginBottom:12, position:'relative' }}>
          <label style={labelStyle}>캠프 이름 *</label>
          <input style={inputStyle} placeholder="예: Punurrunha, Hope Downs 1"
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
          <label style={labelStyle}>케이터링 회사</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CATERING_COS.map(c => (
              <button key={c} type="button" onClick={() => set('catering_company', form.catering_company===c ? '' : c)}
                style={{ padding:'5px 12px', borderRadius:20, cursor:'pointer', fontSize:12, fontFamily:'Noto Sans KR', border:'1.5px solid', transition:'all 0.15s', background: form.catering_company===c ? C.dark : 'transparent', borderColor: form.catering_company===c ? C.dark : C.border, color: form.catering_company===c ? C.gold : C.sub }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 포지션 */}
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>포지션</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom: form.position==='기타' ? 8 : 0 }}>
            {CAMP_POSITIONS.map(p => (
              <button key={p} type="button" onClick={() => set('position', p)}
                style={{ padding:'5px 12px', borderRadius:20, cursor:'pointer', fontSize:12, fontFamily:'Noto Sans KR', border:'1.5px solid', transition:'all 0.15s', background: form.position===p ? C.dark : 'transparent', borderColor: form.position===p ? C.dark : C.border, color: form.position===p ? C.gold : C.sub }}>
                {p}
              </button>
            ))}
          </div>
          {form.position === '기타' && (
            <input style={{ ...inputStyle, marginTop:8 }} placeholder="포지션 직접 입력" value={form.position_custom} onChange={e => set('position_custom', e.target.value)} />
          )}
        </div>

        {/* 한줄평 */}
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>한줄평 *</label>
          <input style={inputStyle} placeholder="이 캠프를 한 문장으로!" value={form.review} onChange={e => set('review', e.target.value)} />
        </div>

        {/* 장단점 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div><label style={labelStyle}>장점 (줄바꿈 구분)</label><textarea style={{ ...inputStyle, height:80, resize:'vertical' }} placeholder={'방 퀄리티 좋음\n식사 훌륭\n저축 빠름'} value={form.pros} onChange={e => set('pros', e.target.value)} /></div>
          <div><label style={labelStyle}>단점 (줄바꿈 구분)</label><textarea style={{ ...inputStyle, height:80, resize:'vertical' }} placeholder={'소셜 생활 없음\n인터넷 느림'} value={form.cons} onChange={e => set('cons', e.target.value)} /></div>
        </div>

        {/* 하루일과 */}
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>하루일과</label>
          <textarea style={{ ...inputStyle, height:100, resize:'vertical' }} placeholder="예: 5:30 기상 → 6시 브렉퍼스트 서비스 → 8시 룸 서비스 → ..." value={form.daily_life} onChange={e => set('daily_life', e.target.value)} />
        </div>

        {/* 만족도 4개 */}
        {[
          { key:'food_satisfaction', label:'🍽️ 음식 만족도' },
          { key:'accommodation_satisfaction', label:'🛏️ 숙소 만족도' },
          { key:'work_satisfaction', label:'💼 일 만족도' },
          { key:'swing_satisfaction', label:'⛏️ 스윙 종합 만족도' },
        ].map(({ key, label }) => (
          <div key={key} style={{ marginBottom:14 }}>
            <label style={labelStyle}>{label} (1-10점) {form[key] ? `— ${form[key]}점` : ''}</label>
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
              <span style={{ fontSize:10, color:'#E53935', fontFamily:'Noto Sans KR' }}>별로</span>
              <span style={{ fontSize:10, color:'#43A047', fontFamily:'Noto Sans KR' }}>최고</span>
            </div>
          </div>
        ))}

        <button onClick={handleSubmit} disabled={submitting} style={{ width:'100%', background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'14px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:15, cursor: submitting?'default':'pointer', opacity: submitting?0.7:1 }}>
          {submitting ? '저장 중...' : '후기 등록하기'}
        </button>
      </div>
    </div>
  )
}

// ─── CampReviewCard ───────────────────────────────────────────────────────────
function CampReviewCard({ review, user, onDelete }) {
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
                <button onClick={e => { e.stopPropagation(); onDelete(review.id) }}
                  style={{ background:'none', border:'none', color:C.sub, fontSize:11, cursor:'pointer', fontFamily:'Noto Sans KR' }}>삭제</button>
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
                  <div style={{ fontSize:11, color:'#3A7A3A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:6 }}>👍 장점</div>
                  {review.pros.map((p,i) => <div key={i} style={{ fontSize:12, color:'#2A5A2A', fontFamily:'Noto Sans KR', marginBottom:3, lineHeight:1.5 }}>· {p}</div>)}
                </div>
              )}
              {review.cons?.length > 0 && (
                <div style={{ background:'#FAF3F3', borderRadius:10, padding:12 }}>
                  <div style={{ fontSize:11, color:'#8A3A3A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:6 }}>👎 단점</div>
                  {review.cons.map((c,i) => <div key={i} style={{ fontSize:12, color:'#6A2A2A', fontFamily:'Noto Sans KR', marginBottom:3, lineHeight:1.5 }}>· {c}</div>)}
                </div>
              )}
            </div>
          )}
          {review.daily_life && (
            <div style={{ background:C.fill, borderRadius:10, padding:12 }}>
              <div style={{ fontSize:11, color:C.accent, fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:6 }}>🌅 하루일과</div>
              <div style={{ fontSize:12, color:C.dark, fontFamily:'Noto Sans KR', lineHeight:1.8, whiteSpace:'pre-line' }}>{review.daily_life}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── FIFOTab ──────────────────────────────────────────────────────────────────
function FIFOTab({ user, onLoginPrompt, reviews, loading, addReview, deleteReview }) {
  const C = useC()
  const [showModal, setShowModal] = useState(false)
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
          <div style={{ fontFamily:'Noto Sans KR', fontSize:16, fontWeight:700, color:C.dark }}>⛏️ FIFO 캠프 후기</div>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:12, color:C.sub, marginTop:2 }}>사이트별 서비스 어텐던트 실제 경험담</div>
        </div>
        <button onClick={() => user ? setShowModal(true) : onLoginPrompt()}
          style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'8px 16px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          + 후기 쓰기
        </button>
      </div>

      {/* 캠프 지도 */}
      <div style={{ marginBottom:16 }}>
        <Suspense fallback={<div style={{ height:320, background:C.fill, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Noto Sans KR', fontSize:13, color:C.sub }}>지도 불러오는 중...</div>}>
          <LazyCampMapView reviews={reviews} onSelectCamp={setSelectedCamp} selectedCamp={selectedCamp} />
        </Suspense>
        <div style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', marginTop:6, textAlign:'center', opacity:0.7 }}>핀 클릭으로 캠프 필터 · 후기 있는 캠프는 숫자 표시</div>
      </div>

      {/* 캠프 필터 */}
      {campsWithReviews.length > 0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', marginBottom:6 }}>캠프별 보기</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button onClick={() => setSelectedCamp('')} style={chip(!selectedCamp)}>전체 ({reviews.length})</button>
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
        <div style={{ textAlign:'center', padding:'40px', color:C.sub, fontFamily:'Noto Sans KR', fontSize:13 }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>⛏️</div>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:15, fontWeight:700, color:C.dark, marginBottom:8 }}>아직 캠프 후기가 없어요</div>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.sub, lineHeight:1.7, marginBottom:20 }}>
            Punurrunha, Hope Downs 1 등<br />캠프 경험 있으신 분 첫 후기 부탁드려요!
          </div>
          <button onClick={() => user ? setShowModal(true) : onLoginPrompt()}
            style={{ background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'10px 24px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            첫 후기 남기기
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {selectedCamp ? (
            <>
              <div style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.sub, marginBottom:4 }}>
                <b style={{ color:C.dark }}>{selectedCamp}</b> 후기 {filtered.length}개
              </div>
              {filtered.map(r => <CampReviewCard key={r.id} review={r} user={user} onDelete={deleteReview} />)}
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
                    <span style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR' }}>후기 {campReviews.length}개</span>
                    <span style={{ fontSize:12, color:C.accent, fontFamily:'Noto Sans KR', marginLeft:'auto' }}>전체보기 →</span>
                  </div>
                  {campReviews.slice(0,2).map(r => <CampReviewCard key={r.id} review={r} user={user} onDelete={deleteReview} />)}
                  {campReviews.length > 2 && (
                    <button onClick={() => setSelectedCamp(campName)}
                      style={{ width:'100%', marginTop:4, background:'transparent', border:`1px dashed ${C.border}`, borderRadius:8, padding:'7px', fontFamily:'Noto Sans KR', fontSize:12, color:C.sub, cursor:'pointer' }}>
                      +{campReviews.length-2}개 더 보기
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {showModal && <CampReviewModal onClose={() => setShowModal(false)} addReview={addReview} user={user} />}
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
  const { reviews: campReviews, loading: campLoading, addReview, deleteReview } = useCampReviews(user)
  const [tab, setTab] = useState('reviews') // 'reviews' | 'qna' | 'best'
  const [region, setRegion]       = useState(params.get('region') || "전체")
  const [type, setType]           = useState(params.get('type') || "전체")
  const [sort, setSort]           = useState("좋아요순")
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
      new Notification('🦘 호주잡 — 새 후기', {
        body: `${regions}에 후기 ${fresh.length}개가 새로 올라왔어요!`,
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
    const key = j.user_id || j.author || '익명'
    if (!authorStats[key]) authorStats[key] = { count:0, hasPhoto:false, totalLikes:0, author: j.author || '익명' }
    authorStats[key].count++
    if (j.photos?.length > 0) authorStats[key].hasPhoto = true
    authorStats[key].totalLikes += j.likes
  })

  useEffect(() => { localStorage.setItem('dark_mode', dark ? 'true' : 'false') }, [dark])

  useEffect(() => {
    if (!targetId || loading || !jobs.length) return
    const job = jobs.find(j => String(j.id) === targetId)
    if (!job) return
    document.title = `${job.title} (${job.region}) — 호주잡`
    const setMeta = (attr, val, prop = 'property') => {
      let el = document.querySelector(`meta[${prop}="${attr}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute(prop, attr); document.head.appendChild(el) }
      el.content = val
    }
    setMeta('og:title', `${job.title} — 호주잡`)
    setMeta('og:description', `${job.region} · $${job.hourly}/hr · "${job.review}"`)
    setMeta('twitter:title', `${job.title} — 호주잡`, 'name')
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
    const { data } = await supabase.from('profiles').select('nickname').eq('id', userId).single()
    if (!data) setShowNicknameModal(true)
    else setCurrentNickname(data.nickname || '')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null; setUser(u); if (u) fetchProfile(u.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null; setUser(u)
      if (u) fetchProfile(u.id); else setShowNicknameModal(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const p = new URLSearchParams()
    if (region !== '전체') p.set('region', region)
    if (type !== '전체') p.set('type', type)
    if (selectedTags.length) p.set('tags', selectedTags.join(','))
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [region, type, selectedTags])

  const signIn  = () => supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: window.location.origin } })
  const signOut = () => supabase.auth.signOut()

  const q = search.trim().toLowerCase()
  const filtered = jobs
    .filter(j => !q || j.title.toLowerCase().includes(q) || (j.company||'').toLowerCase().includes(q))
    .filter(j => region === "전체"  || j.region.includes(region))
    .filter(j => type === "전체"    || j.type === type)
    .filter(j => !photoOnly         || j.photos?.length > 0)
    .filter(j => !myPostsOnly       || j.user_id === user?.id)
    .filter(j => !authorFilter      || (j.author||'익명') === authorFilter)
    .filter(j => selectedTags.length === 0 || j.tags?.some(t => selectedTags.includes(t)))
    .filter(j => j.hourly >= minHourly)
    .filter(j => !secondVisaOnly    || j.second_visa === true)
    .filter(j => !engLevel          || j.english_level === engLevel)
    .filter(j => !bookmarkOnly      || bookmarkedIds.includes(j.id))
    .sort((a,b) =>
      sort === "좋아요순" ? b.likes - a.likes :
      sort === "별점순"   ? b.stars - a.stars :
      sort === "시급순"   ? b.hourly - a.hourly :
      sort === "조회순"   ? (b.views||0) - (a.views||0) : b.id - a.id
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

  const cardProps = { likedIds, onLike:toggleLike, user, onEdit:setEditJob, onLoginPrompt:() => setShowLoginPrompt(true), onShare:() => user ? setShowModal(true) : setShowLoginPrompt(true), updateJob, incrementView, onAuthorClick:setAuthorFilter, bookmarkedIds, onBookmark:toggleBookmark }

  return (
    <ThemeCtx.Provider value={C}>
      <div style={{ minHeight:'100vh', background:C.bg, transition:'background 0.3s' }}>

        {/* 헤더 */}
        <div style={{ borderBottom:`1px solid ${C.border}`, background: dark?'rgba(26,18,16,0.96)':'rgba(250,247,242,0.95)', backdropFilter:'blur(8px)', position:'sticky', top:0, zIndex:50, padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'background 0.3s' }}>
          <div>
            <div style={{ fontFamily:"'Jua','Noto Sans KR',sans-serif", fontSize:22, fontWeight:400, color:C.dark }}>🦘 호주잡</div>
            <div style={{ fontSize:10, color:C.sub, fontFamily:'Noto Sans KR', marginTop:1 }}>호주 워홀러들의 경험담</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={() => setDark(d => !d)} title={dark?'라이트 모드':'다크 모드'}
              style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:15, lineHeight:1 }}>
              {dark ? '☀️' : '🌙'}
            </button>
            {user ? (
              <>
                <img src={user.user_metadata?.avatar_url} alt="프로필" title="닉네임 수정" onClick={() => setEditNickname(true)}
                  style={{ width:28, height:28, borderRadius:'50%', border:`2px solid ${C.accent}`, objectFit:'cover', cursor:'pointer' }}
                  onError={e => { e.target.style.display='none' }} />
                <button onClick={() => setMyPostsOnly(v => !v)} style={{ background: myPostsOnly?C.dark:'transparent', color: myPostsOnly?C.gold:C.sub, border:`1px solid ${myPostsOnly?C.dark:C.border}`, borderRadius:8, padding:'6px 12px', fontFamily:'Noto Sans KR', fontSize:12, cursor:'pointer', transition:'all 0.15s' }}>내 글</button>
                <button onClick={signOut} style={{ background:'transparent', color:C.sub, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 12px', fontFamily:'Noto Sans KR', fontSize:12, cursor:'pointer' }}>로그아웃</button>
              </>
            ) : (
              <button onClick={signIn} style={{ background:'transparent', color:C.dark, border:`1.5px solid ${C.dark}`, borderRadius:8, padding:'6px 12px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                구글로 로그인
              </button>
            )}
            <button onClick={() => user ? setShowReviewTypePicker(true) : setShowLoginPrompt(true)}
              style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'8px 16px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              + 후기 쓰기
            </button>
          </div>
        </div>

        {/* 새 후기 알림 배너 */}
        {newJobsBanner.length > 0 && (
          <div style={{ background: dark?'#2A1E15':'#FFFBF2', borderBottom:`1px solid ${C.accent}40`, padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>🆕</span>
              <span style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.dark }}>
                <b>{[...new Set(newJobsBanner.map(j => j.region))].join(', ')}</b>에 새 후기 {newJobsBanner.length}개가 올라왔어요!
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <button onClick={() => { setTab('reviews'); setNewJobsBanner([]) }} style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'5px 12px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:12, cursor:'pointer' }}>보러가기</button>
              <button onClick={() => setNewJobsBanner([])} style={{ background:'none', border:'none', fontSize:15, cursor:'pointer', color:C.sub, lineHeight:1 }}>✕</button>
            </div>
          </div>
        )}

        <div style={{ maxWidth:680, margin:'0 auto', padding:'0 16px 80px' }}>

          {/* 히어로 */}
          <div style={{ padding:'36px 0 24px' }}>
            <div style={{ fontSize:20, marginBottom:10, letterSpacing:'4px' }}>🇰🇷 → 🇦🇺</div>
            <h1 style={{ fontFamily:"'Jua','Noto Sans KR',sans-serif", fontSize:'clamp(30px,7vw,48px)', fontWeight:400, color:C.dark, margin:'0 0 12px', lineHeight:1.2 }}>
              <span style={{ fontSize:'clamp(14px,3.5vw,20px)', color:C.sub, display:'block', marginBottom:6 }}>한국인끼리만 공유하는</span>
              호주 워킹홀리데이<br />경험담
            </h1>
            <p style={{ color:C.sub, fontSize:14, fontFamily:'Noto Sans KR', lineHeight:1.8, margin:0 }}>
              시급부터 장단점, 면접 꿀팁까지 — 직접 겪은 사람만 아는 정보.
            </p>
          </div>

          {/* 통계 배너 */}
          {stats && (
            <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
              {[{label:'총 후기', value:`${stats.total}개`},{label:'평균 시급', value:`$${stats.avgHourly}/hr`},{label:'인기 직종', value:stats.topTag}].map(({ label, value }) => (
                <div key={label} style={{ flex:1, minWidth:90, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'10px 14px', textAlign:'center' }}>
                  <div style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:C.dark, fontFamily:"'Jua',sans-serif" }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* 탭 네비게이션 */}
          <div style={{ display:'flex', borderBottom:`2px solid ${C.border}`, marginBottom:20 }}>
            {[['reviews','📋 후기'],['fifo','⛏️ FIFO'],['qna','💬 Q&A'],['best','🏆 베스트']].map(([key, label]) => (
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
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="직업명, 회사명으로 검색..."
                  style={{ width:'100%', background:C.card, border:`1.5px solid ${search?C.accent:C.border}`, borderRadius:10, padding:'10px 14px 10px 36px', fontFamily:'Noto Sans KR', fontSize:14, color:C.dark, outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }} />
                {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, color:C.sub }}>✕</button>}
              </div>

              <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                <button onClick={() => setViewMode('list')} style={chip(viewMode==='list')}>📋 목록</button>
                <button onClick={() => setViewMode('map')} style={chip(viewMode==='map')}>🗺️ 지도</button>
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
                  {[0,20,25,30,35].map(n => <button key={n} onClick={() => setMinHourly(n)} style={chip(minHourly===n)}>{n===0?'시급 전체':`$${n}+`}</button>)}
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                  <button onClick={() => setSecondVisaOnly(v=>!v)} style={{ ...chip(secondVisaOnly), borderColor: secondVisaOnly?'#4CAF50':C.border, background: secondVisaOnly?'#E8F5E9':'transparent', color: secondVisaOnly?'#2E7D32':C.sub }}>2nd 비자 가능</button>
                  {['','하','중','상'].map(lv => (
                    <button key={lv} onClick={() => setEngLevel(lv)}
                      style={{ ...chip(engLevel===lv), borderColor: engLevel===lv&&lv?(lv==='하'?'#4CAF50':lv==='중'?'#FFD54F':'#F44336'):engLevel===lv?C.dark:C.border, background: engLevel===lv&&lv?(lv==='하'?'#E8F5E9':lv==='중'?'#FFF8E1':'#FFEBEE'):engLevel===lv?C.dark:'transparent', color: engLevel===lv&&lv?(lv==='하'?'#2E7D32':lv==='중'?'#FF9800':'#C62828'):engLevel===lv?C.gold:C.sub }}>
                      {lv===''?'영어 전체':`영어 ${ENG_LABELS[lv]??lv}`}
                    </button>
                  ))}
                  <button onClick={() => setPhotoOnly(p=>!p)} style={{ ...chip(photoOnly), borderColor: photoOnly?C.accent:C.border, background: photoOnly?'rgba(200,150,60,0.12)':'transparent', color: photoOnly?C.accent:C.sub }}>📷 사진만</button>
                  <button onClick={() => setBookmarkOnly(v=>!v)} style={{ ...chip(bookmarkOnly), borderColor: bookmarkOnly?C.accent:C.border, background: bookmarkOnly?'rgba(200,150,60,0.12)':'transparent', color: bookmarkOnly?C.accent:C.sub }}>🔖 북마크</button>
                  <div style={{ marginLeft:'auto' }}>
                    <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
                      {["좋아요순","별점순","시급순","조회순","최신순"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {authorFilter && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, background:'rgba(200,150,60,0.08)', border:`1px solid ${C.accent}`, borderRadius:10, padding:'8px 14px' }}>
                  <span style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.dark }}><b>{authorFilter}</b>님의 후기만 보는 중</span>
                  <button onClick={() => setAuthorFilter('')} style={{ marginLeft:'auto', background:'none', border:'none', color:C.sub, cursor:'pointer', fontSize:13 }}>✕ 해제</button>
                </div>
              )}
              <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', marginBottom:16, opacity:0.7 }}>
                {loading ? '불러오는 중…' : `${filtered.length}개 결과`}
              </div>

              {viewMode === 'map' && (
                <div style={{ marginBottom:16 }}>
                  <Suspense fallback={<div style={{ height:360, display:'flex', alignItems:'center', justifyContent:'center', background:C.card, border:`1px solid ${C.border}`, borderRadius:12, fontFamily:'Noto Sans KR', fontSize:13, color:C.sub }}>지도 불러오는 중...</div>}>
                    <LazyMapView jobs={filtered} onSelectRegion={r => setRegion(r)} selectedRegion={region} />
                  </Suspense>
                  <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', marginTop:8, textAlign:'center', opacity:0.7 }}>핀을 클릭하면 해당 State로 필터돼요 · 다시 클릭하면 해제</div>
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
                        authorBadges={getAuthorBadges(job.user_id || job.author || '익명', authorStats)} />
                    ))
                }
              </div>
              {!loading && filtered.length === 0 && (
                <div style={{ textAlign:'center', padding:'60px 20px', color:C.sub, fontFamily:'Noto Sans KR', fontSize:14 }}>
                  {bookmarkOnly ? '북마크한 후기가 없어요.' : '아직 후기가 없어요. 첫 번째로 공유해보세요!'}
                </div>
              )}
            </>
          )}

          {/* ─── FIFO 탭 ─── */}
          {tab === 'fifo' && (
            <FIFOTab user={user} onLoginPrompt={() => setShowLoginPrompt(true)}
              reviews={campReviews} loading={campLoading} addReview={addReview} deleteReview={deleteReview} />
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
          <NicknameModal user={user} onSave={(n) => { setCurrentNickname(n); setShowNicknameModal(false) }} />
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
      </div>
    </ThemeCtx.Provider>
  )
}
