import { useState, useEffect } from 'react'
import { useJobs } from './useJobs'
import { supabase } from './supabase'

// Design tokens
const C = {
  dark:    '#2C1A00',
  accent:  '#C8963C',
  gold:    '#FFD580',
  text:    '#2C1A00',
  sub:     '#8A7060',
  border:  '#E8E2D8',
  bg:      '#FAF7F2',
  card:    '#ffffff',
  fill:    '#F5F0E8',
}

function NicknameModal({ user, onSave }) {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const trimmed = nickname.trim()
    if (!trimmed) { setError('닉네임을 입력해주세요.'); return }
    if (trimmed.length < 2) { setError('2자 이상 입력해주세요.'); return }
    if (trimmed.length > 20) { setError('20자 이하로 입력해주세요.'); return }
    setSaving(true)
    const { error: err } = await supabase.from('profiles').insert({ id: user.id, nickname: trimmed })
    if (err) {
      setError(err.code === '23505' ? '이미 사용 중인 닉네임이에요.' : '저장 실패. 다시 시도해주세요.')
      setSaving(false)
    } else {
      onSave(trimmed)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:150, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:36, width:'100%', maxWidth:380, textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize:36, marginBottom:14 }}>👤</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:C.dark, marginBottom:8 }}>닉네임을 정해줘요</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:13, color:C.sub, marginBottom:24, lineHeight:1.7 }}>
          모든 글에 이 닉네임이 표시돼요.<br />나중에 수정하면 기존 글도 자동 반영돼요.
        </div>
        <input
          value={nickname}
          onChange={e => { setNickname(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="예: 퍼스워홀러, 광산킹, Kenny"
          maxLength={20}
          style={{ width:'100%', background:C.fill, border:`1.5px solid ${error ? '#E05050' : C.border}`, borderRadius:8, padding:'11px 14px', color:C.dark, fontSize:14, fontFamily:'Noto Sans KR', outline:'none', boxSizing:'border-box', marginBottom:6 }}
        />
        {error && <div style={{ fontSize:12, color:'#E05050', fontFamily:'Noto Sans KR', marginBottom:10 }}>{error}</div>}
        <button onClick={handleSave} disabled={saving} style={{ width:'100%', background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'13px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, marginTop:8 }}>
          {saving ? '저장 중...' : '닉네임 저장하기'}
        </button>
      </div>
    </div>
  )
}

function LoginPromptModal({ onClose, onLogin }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:36, width:'100%', maxWidth:360, textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize:36, marginBottom:14 }}>🔐</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:C.dark, marginBottom:8 }}>로그인이 필요해요</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:C.sub, lineHeight:1.7, marginBottom:28 }}>
          후기를 올리려면 구글 계정으로<br />로그인해주세요.
        </div>
        <button onClick={onLogin} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'13px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer', marginBottom:10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          구글로 로그인하기
        </button>
        <button onClick={onClose} style={{ width:'100%', background:'transparent', color:C.sub, border:'none', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer' }}>취소</button>
      </div>
    </div>
  )
}


const REGIONS = ["전체", "WA", "NSW", "VIC", "QLD", "SA", "NT", "TAS", "ACT"]
const TYPES   = ["전체", "Casual", "Part-time", "Full-time"]

const CLOUDINARY_CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

async function uploadPhoto(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST', body: formData,
  })
  const data = await res.json()
  return data.secure_url
}

function Stars({ n }) {
  return (
    <div style={{ display:'flex', gap:2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize:13, color: i<=n ? '#F5A623' : C.border }}>★</span>
      ))}
    </div>
  )
}

function PhotoGallery({ photos }) {
  const [active, setActive] = useState(null)
  if (!photos?.length) return null
  return (
    <>
      <div style={{ display:'flex', gap:8, overflowX:'auto', padding:'0 20px 14px', scrollbarWidth:'none' }}>
        {photos.map((p, i) => (
          <div key={i} onClick={e => { e.stopPropagation(); setActive(i) }}
            style={{ flexShrink:0, width: photos.length===1 ? '100%' : 160, height:110, borderRadius:10, overflow:'hidden', cursor:'zoom-in', position:'relative', border:`1px solid ${C.border}` }}>
            <img src={p.url} alt={p.caption} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
        ))}
      </div>
      {active !== null && (
        <div onClick={e => { e.stopPropagation(); setActive(null) }}
          style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ position:'relative', maxWidth:600, width:'100%' }}>
            <img src={photos[active].url} style={{ width:'100%', borderRadius:12, maxHeight:'70vh', objectFit:'contain' }} />
            {photos.length > 1 && (
              <div style={{ display:'flex', justifyContent:'center', gap:12, marginTop:16 }}>
                <button onClick={e => { e.stopPropagation(); setActive(a => (a-1+photos.length)%photos.length) }}
                  style={{ background:'rgba(255,255,255,0.12)', border:'none', color:'#fff', borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:16 }}>‹</button>
                <span style={{ color:'#999', fontFamily:'Noto Sans KR', fontSize:13, alignSelf:'center' }}>{active+1} / {photos.length}</span>
                <button onClick={e => { e.stopPropagation(); setActive(a => (a+1)%photos.length) }}
                  style={{ background:'rgba(255,255,255,0.12)', border:'none', color:'#fff', borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:16 }}>›</button>
              </div>
            )}
            <button onClick={e => { e.stopPropagation(); setActive(null) }}
              style={{ position:'absolute', top:-14, right:-14, background:C.dark, color:C.gold, border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>
        </div>
      )}
    </>
  )
}

function PhotoUploader({ photos, setPhotos }) {
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
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position:'relative', width:80, height:80 }}>
              <img src={p.url} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8, border:`1px solid ${C.border}` }} />
              <button onClick={() => setPhotos(prev => prev.filter((_,idx) => idx !== i))}
                style={{ position:'absolute', top:-6, right:-6, background:C.dark, color:C.gold, border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
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

const TAGS = ['광산','카페','농장','주방','리테일','건설','서비스','물류','기타']
const EMPTY_FORM = { title:'', company:'', region:'WA', location:'', type:'Casual', hourly:'', shift:'', review:'', pros:'', cons:'', daily_life:'', interview_tips:'', stars:4, author:'', tag:'' }

function SubmitModal({ onClose, addJob, updateJob, editData, user }) {
  const isEdit = !!editData

  const toForm = (data) => data ? {
    title: data.title || '',
    company: data.company || '',
    region: data.region || 'WA',
    location: data.location || '',
    type: data.type || 'Casual',
    hourly: data.hourly || '',
    shift: data.shift || '',
    review: data.review || '',
    pros: Array.isArray(data.pros) ? data.pros.join('\n') : (data.pros || ''),
    cons: Array.isArray(data.cons) ? data.cons.join('\n') : (data.cons || ''),
    daily_life: data.daily_life || '',
    interview_tips: data.interview_tips || '',
    stars: data.stars || 4,
    author: data.author || '',
    tag: data.tag || '',
  } : EMPTY_FORM

  const [form, setForm] = useState(() => toForm(editData))
  const [photos, setPhotos] = useState(() =>
    editData?.photos?.length ? editData.photos : []
  )
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inputStyle = { width:'100%', background:C.fill, border:`1.5px solid ${C.border}`, borderRadius:8, padding:'10px 12px', color:C.dark, fontSize:14, fontFamily:'Noto Sans KR', outline:'none', boxSizing:'border-box' }
  const labelStyle = { fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', marginBottom:6, display:'block' }

  const handleSubmit = async () => {
    if (!form.title || !form.hourly || !form.review) {
      alert('직업명, 시급, 한줄평은 필수예요!')
      return
    }
    setSubmitting(true)
    const payload = {
      ...form,
      hourly: Number(form.hourly),
      photos: photos.map(p => p.url).join(','),
      tag: form.tag || null,
      ...(!isEdit && user ? { user_id: user.id } : {}),
    }
    const success = isEdit
      ? await updateJob(editData.id, payload)
      : await addJob(payload)
    setSubmitting(false)
    if (success) setDone(true)
    else alert('저장 실패. 다시 시도해주세요.')
  }

  if (done) return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:40, width:'100%', maxWidth:400, textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize:44, marginBottom:16 }}>{isEdit ? '✅' : '🎉'}</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.dark, marginBottom:8 }}>
          {isEdit ? '수정 완료!' : '공유해줘서 고마워요!'}
        </div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:C.sub, lineHeight:1.7, marginBottom:24 }}>
          {isEdit ? '변경사항이 저장됐어요.' : '다음 워홀러에게 큰 도움이 될 거예요.'}
        </div>
        <button onClick={onClose} style={{ background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'12px 28px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer' }}>닫기</button>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.card, borderRadius:16, padding:28, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:C.dark }}>
            {isEdit ? '후기 수정하기' : '내 경험 공유하기'}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#bbb' }}>✕</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div>
            <label style={labelStyle}>직업명 *</label>
            <input style={inputStyle} placeholder="예: Service Attendant" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>고용주/회사</label>
            <input style={inputStyle} placeholder="예: Sodexo" value={form.company} onChange={e => set('company', e.target.value)} />
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div>
            <label style={labelStyle}>주(State) *</label>
            <select style={inputStyle} value={form.region} onChange={e => set('region', e.target.value)}>
              {['WA','NSW','VIC','QLD','SA','NT','TAS','ACT'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>고용 형태 *</label>
            <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
              {['Casual','Part-time','Full-time'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>세부 위치 (선택 — 예: 퍼스 노스, 번다버그, 시드니 CBD)</label>
          <input style={inputStyle} placeholder="도시 또는 지역명" value={form.location} onChange={e => set('location', e.target.value)} />
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>직종 분류 (선택 — 안 하면 자동 분류)</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {TAGS.map(t => (
              <button key={t} type="button" onClick={() => set('tag', form.tag === t ? '' : t)}
                style={{ padding:'5px 12px', borderRadius:20, cursor:'pointer', fontSize:12, fontFamily:'Noto Sans KR', border:'1.5px solid', transition:'all 0.15s', background: form.tag === t ? C.dark : 'transparent', borderColor: form.tag === t ? C.dark : C.border, color: form.tag === t ? C.gold : C.sub }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div>
            <label style={labelStyle}>시급 (AUD) *</label>
            <input style={inputStyle} type="number" placeholder="예: 32" value={form.hourly} onChange={e => set('hourly', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>주요 시프트</label>
            <input style={inputStyle} placeholder="예: 12h 야간" value={form.shift} onChange={e => set('shift', e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>한줄평 * — 이 직업을 한 문장으로!</label>
          <input style={inputStyle} placeholder="예: 몸은 힘들지만 통장이 웃는다" value={form.review} onChange={e => set('review', e.target.value)} />
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>장점 (줄바꿈으로 구분)</label>
          <textarea style={{ ...inputStyle, height:80, resize:'vertical' }} placeholder="시급 높음&#10;숙식 제공&#10;저축 빠름" value={form.pros} onChange={e => set('pros', e.target.value)} />
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>단점 (줄바꿈으로 구분)</label>
          <textarea style={{ ...inputStyle, height:80, resize:'vertical' }} placeholder="소셜 생활 제로&#10;체력 소모 큼" value={form.cons} onChange={e => set('cons', e.target.value)} />
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>하루 일과 — A day in the life</label>
          <textarea style={{ ...inputStyle, height:100, resize:'vertical' }} placeholder="예: 6시 기상 → 7시 브렉퍼스트 룸 세팅 → 9시 청소 시작 → 12시 점심 → 오후 청소 마무리 → 6시 퇴근" value={form.daily_life} onChange={e => set('daily_life', e.target.value)} />
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>면접 꿀팁 (선택)</label>
          <textarea style={{ ...inputStyle, height:80, resize:'vertical' }} placeholder="예: 경력 없어도 됨, 복장은 캐주얼 OK, 영어 인터뷰 5분 정도" value={form.interview_tips} onChange={e => set('interview_tips', e.target.value)} />
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>추천 점수</label>
          <div style={{ display:'flex', gap:8 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => set('stars', n)} style={{ background: n <= form.stars ? 'rgba(245,166,35,0.12)' : 'transparent', border:`1.5px solid ${n <= form.stars ? '#F5A623' : C.border}`, borderRadius:8, padding:'8px 14px', cursor:'pointer', color: n <= form.stars ? '#F5A623' : C.border, fontSize:18 }}>★</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={labelStyle}>📷 현장 사진 (선택)</label>
          <PhotoUploader photos={photos} setPhotos={setPhotos} />
        </div>

        <button onClick={handleSubmit} disabled={submitting} style={{ width:'100%', background:C.dark, color:C.gold, border:'none', borderRadius:10, padding:'14px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:15, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? '저장 중...' : (isEdit ? '수정 완료' : '공유하기')}
        </button>
      </div>
    </div>
  )
}

function JobCard({ job, liked, onLike, user, onEdit, onLoginPrompt }) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const hasPhotos = job.photos?.length > 0
  const isOwner = user && job.user_id && user.id === job.user_id

  useEffect(() => {
    if (!open) return
    supabase.from('comments')
      .select('*, profiles(nickname)')
      .eq('job_id', job.id)
      .order('created_at')
      .then(({ data }) => setComments(data || []))
  }, [open, job.id])

  const postComment = async (e) => {
    e.stopPropagation()
    if (!commentText.trim()) return
    setPosting(true)
    const { data, error } = await supabase.from('comments')
      .insert({ job_id: job.id, user_id: user.id, content: commentText.trim() })
      .select('*, profiles(nickname)')
      .single()
    if (!error && data) {
      setComments(prev => [...prev, data])
      setCommentText('')
    }
    setPosting(false)
  }

  const deleteComment = async (e, commentId) => {
    e.stopPropagation()
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  return (
    <div onClick={() => setOpen(o => !o)}
      style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden', cursor:'pointer', transition:'box-shadow 0.18s, transform 0.18s', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,0.1)'; e.currentTarget.style.transform='translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.transform='none' }}
    >
      {hasPhotos && <div style={{ paddingTop:14 }}><PhotoGallery photos={job.photos} /></div>}

      <div style={{ padding:'16px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:C.dark }}>{job.title}</span>
              <span style={{ fontSize:10, color:C.sub, fontFamily:'Noto Sans KR', opacity:0.7 }}>{job.tag}</span>
              {hasPhotos && <span style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', opacity:0.7 }}>📷 {job.photos.length}</span>}
            </div>
            {job.company && (
              <div style={{ fontSize:14, fontWeight:700, color:C.dark, fontFamily:'Noto Sans KR', marginBottom:4, opacity:0.75 }}>{job.company}</div>
            )}
            <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR' }}>
              {job.region}{job.location ? ` · ${job.location}` : ''} · {job.type}
            </div>
          </div>
          <div style={{ background:C.dark, color:C.gold, borderRadius:10, padding:'8px 14px', textAlign:'center', minWidth:56, flexShrink:0, marginLeft:14 }}>
            <div style={{ fontFamily:'monospace', fontWeight:800, fontSize:20, lineHeight:1 }}>${job.hourly}</div>
            <div style={{ fontSize:10, opacity:0.6, marginTop:2 }}>/hr AUD</div>
          </div>
        </div>

        <div style={{ background:C.fill, borderLeft:`3px solid ${C.accent}`, borderRadius:'0 8px 8px 0', padding:'10px 14px', marginBottom:12, fontFamily:'Noto Sans KR', fontSize:13, color:C.dark, fontStyle:'italic', lineHeight:1.6, opacity:0.85 }}>
          "{job.review}"
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Stars n={job.stars} />
            {isOwner && (
              <button
                onClick={e => { e.stopPropagation(); onEdit(job) }}
                style={{ background:'transparent', border:`1px solid ${C.accent}`, borderRadius:6, padding:'2px 8px', cursor:'pointer', fontFamily:'Noto Sans KR', fontSize:11, color:C.accent }}
              >
                수정
              </button>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:11, color:C.sub, fontFamily:'Noto Sans KR', opacity:0.8 }}>{job.author || '익명'}</div>
            <button onClick={e => { e.stopPropagation(); onLike(job.id) }}
              style={{ display:'flex', alignItems:'center', gap:4, background: liked ? 'rgba(200,150,60,0.1)' : 'transparent', border:`1px solid ${liked ? C.accent : C.border}`, borderRadius:20, padding:'4px 10px', cursor:'pointer', fontFamily:'Noto Sans KR', fontSize:13, color: liked ? C.accent : C.sub, transition:'all 0.15s' }}>
              <span>{liked ? '❤️' : '🤍'}</span>
              <span>{job.likes}</span>
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:13, color:C.sub, opacity:0.7 }}>
              <span>💬</span>
              <span>{comments.length}</span>
            </div>
          </div>
        </div>
      </div>

      {open && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:'16px 20px 20px', background:C.bg }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom: (job.daily_life || job.interview_tips) ? 10 : 0 }}>
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
            <div style={{ background:C.fill, borderRadius:10, padding:14, marginBottom: job.interview_tips ? 10 : 0 }}>
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

          {/* 댓글 섹션 */}
          <div style={{ marginTop:14, borderTop:`1px solid ${C.border}`, paddingTop:14 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:10 }}>댓글 {comments.length > 0 ? comments.length : ''}</div>
            {comments.map(c => (
              <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <span style={{ fontSize:12, fontWeight:700, color:C.dark, fontFamily:'Noto Sans KR', marginRight:6 }}>{c.profiles?.nickname || '익명'}</span>
                  <span style={{ fontSize:13, color:C.dark, fontFamily:'Noto Sans KR', lineHeight:1.6 }}>{c.content}</span>
                </div>
                {user?.id === c.user_id && (
                  <button onClick={e => deleteComment(e, c.id)} style={{ background:'none', border:'none', color:C.sub, fontSize:11, cursor:'pointer', padding:'0 4px', flexShrink:0 }}>삭제</button>
                )}
              </div>
            ))}
            {comments.length === 0 && <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', opacity:0.6, marginBottom:10 }}>첫 댓글을 달아보세요</div>}

            {user ? (
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment(e)}
                  placeholder="댓글 달기..."
                  style={{ flex:1, background:C.fill, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, fontFamily:'Noto Sans KR', color:C.dark, outline:'none' }}
                />
                <button onClick={postComment} disabled={posting || !commentText.trim()}
                  style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'8px 14px', fontFamily:'Noto Sans KR', fontSize:13, cursor: posting ? 'default' : 'pointer', opacity: (!commentText.trim() || posting) ? 0.5 : 1 }}>
                  등록
                </button>
              </div>
            ) : (
              <button onClick={onLoginPrompt} style={{ fontSize:12, color:C.accent, fontFamily:'Noto Sans KR', background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 14px', cursor:'pointer', width:'100%' }}>
                로그인하면 댓글을 달 수 있어요
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [user, setUser]                         = useState(null)
  const { jobs, loading, likedIds, toggleLike, addJob, updateJob } = useJobs(user)
  const [region, setRegion]       = useState("전체")
  const [type, setType]           = useState("전체")
  const [sort, setSort]           = useState("좋아요순")
  const [photoOnly, setPhotoOnly] = useState(false)
  const [showModal, setShowModal]               = useState(false)
  const [editJob, setEditJob]                   = useState(null)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt]   = useState(false)

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('nickname').eq('id', userId).single()
    if (!data) setShowNicknameModal(true)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id)
      else setShowNicknameModal(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn  = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  const signOut = () => supabase.auth.signOut()

  const filtered = jobs
    .filter(j => region === "전체" || j.region.includes(region))
    .filter(j => type === "전체"   || j.type === type)
    .filter(j => !photoOnly        || j.photos?.length > 0)
    .sort((a,b) =>
      sort === "좋아요순" ? b.likes - a.likes :
      sort === "별점순"   ? b.stars - a.stars :
      sort === "시급순"   ? b.hourly - a.hourly : b.id - a.id
    )

  const chip = (active) => ({
    padding:'5px 12px', borderRadius:20, cursor:'pointer',
    fontSize:12, fontFamily:'Noto Sans KR', border:'1px solid',
    transition:'all 0.15s',
    background: active ? C.dark : 'transparent',
    borderColor: active ? C.dark : C.border,
    color: active ? C.gold : C.sub,
  })

  const selectStyle = {
    background: C.card, border:`1px solid ${C.border}`, borderRadius:8,
    padding:'5px 10px', fontFamily:'Noto Sans KR', fontSize:12, color:C.sub,
    cursor:'pointer', outline:'none',
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg }}>

      {/* 헤더 */}
      <div style={{ borderBottom:`1px solid ${C.border}`, background:`rgba(250,247,242,0.95)`, backdropFilter:'blur(8px)', position:'sticky', top:0, zIndex:50, padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:900, color:C.dark }}>🦘 호주잡</div>
          <div style={{ fontSize:10, color:C.sub, fontFamily:'Noto Sans KR', marginTop:1 }}>호주 워홀러들의 직업 후기</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {user ? (
            <>
              <img
                src={user.user_metadata?.avatar_url}
                alt="프로필"
                style={{ width:28, height:28, borderRadius:'50%', border:`2px solid ${C.accent}`, objectFit:'cover' }}
                onError={e => { e.target.style.display='none' }}
              />
              <button onClick={signOut} style={{ background:'transparent', color:C.sub, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 12px', fontFamily:'Noto Sans KR', fontSize:12, cursor:'pointer' }}>
                로그아웃
              </button>
            </>
          ) : (
            <button onClick={signIn} style={{ background:'transparent', color:C.dark, border:`1.5px solid ${C.dark}`, borderRadius:8, padding:'6px 12px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              구글로 로그인
            </button>
          )}
          <button onClick={() => user ? setShowModal(true) : setShowLoginPrompt(true)} style={{ background:C.dark, color:C.gold, border:'none', borderRadius:8, padding:'8px 16px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            + 후기 쓰기
          </button>
        </div>
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'0 16px 80px' }}>

        {/* 히어로 */}
        <div style={{ padding:'36px 0 24px' }}>
          <div style={{ fontSize:11, letterSpacing:'3px', color:C.accent, fontFamily:'Noto Sans KR', marginBottom:10, textTransform:'uppercase' }}>KOREA → AUSTRALIA</div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(28px,7vw,44px)', fontWeight:900, color:C.dark, margin:'0 0 12px', lineHeight:1.15 }}>
            호주 워킹홀리데이<br />직업 후기
          </h1>
          <p style={{ color:C.sub, fontSize:14, fontFamily:'Noto Sans KR', lineHeight:1.8, margin:0 }}>
            시급부터 솔직한 장단점까지 — 직접 겪은 사람만 아는 정보.
          </p>
        </div>

        {/* 필터 */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            {REGIONS.map(r => <button key={r} onClick={() => setRegion(r)} style={chip(region===r)}>{r}</button>)}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {TYPES.map(t => <button key={t} onClick={() => setType(t)} style={chip(type===t)}>{t}</button>)}
            <button onClick={() => setPhotoOnly(p=>!p)} style={{ ...chip(photoOnly), borderColor: photoOnly ? C.accent : C.border, background: photoOnly ? 'rgba(200,150,60,0.12)' : 'transparent', color: photoOnly ? C.accent : C.sub }}>📷 사진만</button>
            <div style={{ marginLeft:'auto' }}>
              <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
                {["좋아요순","별점순","시급순","최신순"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ fontSize:12, color:C.sub, fontFamily:'Noto Sans KR', marginBottom:16, opacity:0.7 }}>
          {loading ? '불러오는 중…' : `${filtered.length}개 결과`}
        </div>

        {/* 카드 목록 */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filtered.map(job => (
            <JobCard key={job.id} job={job} liked={likedIds.includes(job.id)} onLike={toggleLike} user={user} onEdit={setEditJob} onLoginPrompt={() => setShowLoginPrompt(true)} />
          ))}
        </div>

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 20px', color:C.sub, fontFamily:'Noto Sans KR', fontSize:14 }}>
            아직 후기가 없어요. 첫 번째로 공유해보세요!
          </div>
        )}
      </div>

      {showNicknameModal && user && (
        <NicknameModal user={user} onSave={() => setShowNicknameModal(false)} />
      )}
      {showLoginPrompt && (
        <LoginPromptModal onClose={() => setShowLoginPrompt(false)} onLogin={signIn} />
      )}
      {showModal && (
        <SubmitModal
          onClose={() => setShowModal(false)}
          addJob={addJob}
          updateJob={updateJob}
          user={user}
        />
      )}
      {editJob && (
        <SubmitModal
          onClose={() => setEditJob(null)}
          addJob={addJob}
          updateJob={updateJob}
          editData={editJob}
          user={user}
        />
      )}
    </div>
  )
}
