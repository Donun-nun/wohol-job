import { useState, useEffect } from 'react'
import { useJobs } from './useJobs'
import { supabase } from './supabase'

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
    <div style={{ position:'fixed', inset:0, zIndex:150, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#FEFAF3', borderRadius:20, padding:40, width:'100%', maxWidth:380, textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>👤</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'#2C1A00', marginBottom:8 }}>닉네임을 정해줘요</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:13, color:'#8A7050', marginBottom:24, lineHeight:1.7 }}>
          모든 글에 이 닉네임이 표시돼요.<br />나중에 수정하면 기존 글도 자동 반영돼요.
        </div>
        <input
          value={nickname}
          onChange={e => { setNickname(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="예: 퍼스워홀러, 광산킹, Kenny"
          maxLength={20}
          style={{ width:'100%', background:'#F5EDD8', border:`1.5px solid ${error ? '#E05050' : '#E0D0B0'}`, borderRadius:8, padding:'11px 14px', color:'#2C1A00', fontSize:14, fontFamily:'Noto Sans KR', outline:'none', boxSizing:'border-box', marginBottom:6 }}
        />
        {error && <div style={{ fontSize:12, color:'#E05050', fontFamily:'Noto Sans KR', marginBottom:10 }}>{error}</div>}
        <button onClick={handleSave} disabled={saving} style={{ width:'100%', background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:10, padding:'13px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, marginTop:8 }}>
          {saving ? '저장 중...' : '닉네임 저장하기'}
        </button>
      </div>
    </div>
  )
}

function LoginPromptModal({ onClose, onLogin }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#FEFAF3', borderRadius:20, padding:40, width:'100%', maxWidth:380, textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🔐</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'#2C1A00', marginBottom:8 }}>로그인이 필요해요</div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:'#8A7050', lineHeight:1.7, marginBottom:28 }}>
          후기를 올리려면 구글 계정으로<br />로그인해주세요.
        </div>
        <button onClick={onLogin} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:10, padding:'13px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer', marginBottom:10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          구글로 로그인하기
        </button>
        <button onClick={onClose} style={{ width:'100%', background:'transparent', color:'#9A7A50', border:'none', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer' }}>취소</button>
      </div>
    </div>
  )
}

const TAG_COLORS = {
  "광산": ["#7C4A00", "#FFD580"],
  "카페": ["#1A3A2A", "#7FFFC4"],
  "농장": ["#2A3A00", "#C8FF80"],
  "주방": ["#3A1A00", "#FFA87F"],
  "리테일": ["#001A3A", "#80C8FF"],
  "건설": ["#2A0038", "#E080FF"],
  "서비스": ["#1A2A3A", "#80D4FF"],
  "물류":  ["#1A3A2A", "#80FFB4"],
  "기타":  ["#2A2A2A", "#D0D0D0"],
}

const REGIONS = ["전체", "WA", "VIC", "NSW", "QLD", "SA", "NT"]
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
        <span key={i} style={{ fontSize:13, color: i<=n ? '#F5A623' : '#D4C5A9' }}>★</span>
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
            style={{ flexShrink:0, width: photos.length===1 ? '100%' : 160, height:110, borderRadius:10, overflow:'hidden', cursor:'zoom-in', position:'relative', border:'1.5px solid #E0D0B0' }}>
            <img src={p.url} alt={p.caption} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
        ))}
      </div>
      {active !== null && (
        <div onClick={e => { e.stopPropagation(); setActive(null) }}
          style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ position:'relative', maxWidth:600, width:'100%' }}>
            <img src={photos[active].url} style={{ width:'100%', borderRadius:14, maxHeight:'70vh', objectFit:'contain' }} />
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
              style={{ position:'absolute', top:-14, right:-14, background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
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
              <img src={p.url} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8, border:'1.5px solid #E0D0B0' }} />
              <button onClick={() => setPhotos(prev => prev.filter((_,idx) => idx !== i))}
                style={{ position:'absolute', top:-6, right:-6, background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <label style={{ display:'inline-block', cursor:'pointer', background: uploading ? 'rgba(0,0,0,0.04)' : 'rgba(200,150,60,0.08)', border:'1.5px dashed #C8963C', borderRadius:10, padding:'10px 20px', fontFamily:'Noto Sans KR', fontSize:13, color:'#C8963C' }}>
        {uploading ? '업로드 중...' : '📷 사진 선택하기'}
        <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ display:'none' }} disabled={uploading} />
      </label>
      <div style={{ fontSize:11, color:'#B8A070', fontFamily:'Noto Sans KR', marginTop:6 }}>여러 장 동시 선택 가능</div>
    </div>
  )
}

const TAGS = ['광산','카페','농장','주방','리테일','건설','서비스','물류','기타']
const EMPTY_FORM = { title:'', company:'', region:'WA (퍼스)', type:'Casual', hourly:'', shift:'', review:'', pros:'', cons:'', daily_life:'', interview_tips:'', stars:4, author:'', tag:'' }

function SubmitModal({ onClose, addJob, updateJob, editData, user }) {
  const isEdit = !!editData

  const toForm = (data) => data ? {
    title: data.title || '',
    company: data.company || '',
    region: data.region || 'WA (퍼스)',
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

  const inputStyle = { width:'100%', background:'#F5EDD8', border:'1.5px solid #E0D0B0', borderRadius:8, padding:'10px 12px', color:'#2C1A00', fontSize:14, fontFamily:'Noto Sans KR', outline:'none', boxSizing:'border-box' }
  const labelStyle = { fontSize:12, color:'#9A7A50', fontFamily:'Noto Sans KR', marginBottom:6, display:'block' }

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
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#FEFAF3', borderRadius:20, padding:40, width:'100%', maxWidth:400, textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>{isEdit ? '✅' : '🎉'}</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'#2C1A00', marginBottom:8 }}>
          {isEdit ? '수정 완료!' : '공유해줘서 고마워요!'}
        </div>
        <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:'#8A7050', lineHeight:1.7, marginBottom:24 }}>
          {isEdit ? '변경사항이 저장됐어요.' : '다음 워홀러에게 큰 도움이 될 거예요.'}
        </div>
        <button onClick={onClose} style={{ background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:10, padding:'12px 28px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer' }}>닫기</button>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#FEFAF3', borderRadius:20, padding:28, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'#2C1A00' }}>
            {isEdit ? '후기 수정하기' : '내 경험 공유하기'}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#999' }}>✕</button>
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
            <label style={labelStyle}>지역 *</label>
            <select style={inputStyle} value={form.region} onChange={e => set('region', e.target.value)}>
              {['WA (퍼스)','WA (FIFO 광산)','NSW (시드니)','VIC (멜버른)','QLD (브리즈번)','QLD (번다버그 농장)','SA (애들레이드)','NT (다윈)','기타'].map(r => <option key={r}>{r}</option>)}
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
          <label style={labelStyle}>직종 분류 (선택 — 안 하면 자동 분류)</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {TAGS.map(t => (
              <button key={t} type="button" onClick={() => set('tag', form.tag === t ? '' : t)}
                style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer', fontSize:12, fontFamily:'Noto Sans KR', border:'1.5px solid', transition:'all 0.15s', background: form.tag === t ? '#2C1A00' : 'transparent', borderColor: form.tag === t ? '#2C1A00' : '#D4C5A9', color: form.tag === t ? '#FFD580' : '#8A7050' }}>
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
              <button key={n} onClick={() => set('stars', n)} style={{ background: n <= form.stars ? 'rgba(245,166,35,0.15)' : 'transparent', border:`1.5px solid ${n <= form.stars ? '#F5A623' : '#E0D0B0'}`, borderRadius:8, padding:'8px 14px', cursor:'pointer', color: n <= form.stars ? '#F5A623' : '#C0A880', fontSize:18 }}>★</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={labelStyle}>📷 현장 사진 (선택)</label>
          <PhotoUploader photos={photos} setPhotos={setPhotos} />
        </div>

        <button onClick={handleSubmit} disabled={submitting} style={{ width:'100%', background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:10, padding:'14px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:15, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? '저장 중...' : (isEdit ? '수정 완료 ✅' : '공유하기 🎉')}
        </button>
      </div>
    </div>
  )
}

function JobCard({ job, liked, onLike, user, onEdit }) {
  const [open, setOpen] = useState(false)
  const [tc, tb] = TAG_COLORS[job.tag] || TAG_COLORS["기타"]
  const hasPhotos = job.photos?.length > 0
  const isOwner = user && job.user_id && user.id === job.user_id

  return (
    <div onClick={() => setOpen(o => !o)}
      style={{ background:'#FEFAF3', border:'1.5px solid #E8DCC8', borderRadius:16, overflow:'hidden', cursor:'pointer', transition:'box-shadow 0.18s, transform 0.18s', boxShadow:'0 2px 8px rgba(120,90,40,0.07)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 8px 28px rgba(120,90,40,0.15)'; e.currentTarget.style.transform='translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='0 2px 8px rgba(120,90,40,0.07)'; e.currentTarget.style.transform='none' }}
    >
      {hasPhotos && <div style={{ paddingTop:14 }}><PhotoGallery photos={job.photos} /></div>}

      <div style={{ padding:'16px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:'#2C1A00' }}>{job.title}</span>
              <span style={{ background:tc, color:tb, fontSize:11, padding:'2px 9px', borderRadius:20, fontFamily:'Noto Sans KR', fontWeight:700 }}>{job.tag}</span>
              {hasPhotos && <span style={{ fontSize:11, color:'#B8A070', fontFamily:'Noto Sans KR' }}>📷 {job.photos.length}</span>}
              {isOwner && (
                <button
                  onClick={e => { e.stopPropagation(); onEdit(job) }}
                  style={{ background:'rgba(200,150,60,0.1)', border:'1.5px solid #C8963C', borderRadius:8, padding:'2px 10px', cursor:'pointer', fontFamily:'Noto Sans KR', fontSize:11, color:'#C8963C' }}
                >
                  ✏️ 수정
                </button>
              )}
            </div>
            <div style={{ fontSize:12, color:'#9A7A50', fontFamily:'Noto Sans KR' }}>{job.region} · {job.type}</div>
          </div>
          <div style={{ background:'#2C1A00', color:'#FFD580', borderRadius:12, padding:'8px 14px', textAlign:'center', minWidth:58, flexShrink:0, marginLeft:12 }}>
            <div style={{ fontFamily:'monospace', fontWeight:800, fontSize:20, lineHeight:1 }}>${job.hourly}</div>
            <div style={{ fontSize:10, opacity:0.7, marginTop:2 }}>/hr AUD</div>
          </div>
        </div>

        <div style={{ background:'#F5EDD8', borderLeft:'3px solid #C8963C', borderRadius:'0 8px 8px 0', padding:'10px 14px', marginBottom:12, fontFamily:'Noto Sans KR', fontSize:13, color:'#4A3010', fontStyle:'italic', lineHeight:1.6 }}>
          "{job.review}"
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <Stars n={job.stars} />
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:11, color:'#B8A080', fontFamily:'Noto Sans KR' }}>{job.shift} · {job.author || '익명'} · {job.date}</div>
            <button onClick={e => { e.stopPropagation(); onLike(job.id) }}
              style={{ display:'flex', alignItems:'center', gap:4, background: liked ? 'rgba(200,150,60,0.15)' : 'rgba(0,0,0,0.04)', border:`1.5px solid ${liked ? '#C8963C' : '#E0D0B0'}`, borderRadius:20, padding:'4px 12px', cursor:'pointer', fontFamily:'Noto Sans KR', fontSize:13, color: liked ? '#C8963C' : '#A08060', transition:'all 0.15s' }}>
              <span>{liked ? '❤️' : '🤍'}</span>
              <span>{job.likes}</span>
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div style={{ borderTop:'1.5px solid #E8DCC8', padding:'16px 20px 20px', background:'#FFFDF8' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom: job.daily_life ? 12 : 0 }}>
            <div style={{ background:'#F0F9F0', borderRadius:10, padding:14 }}>
              <div style={{ fontSize:11, color:'#3A7A3A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:8 }}>👍 장점</div>
              {job.pros.map((p,i) => <div key={i} style={{ fontSize:13, color:'#2A5A2A', fontFamily:'Noto Sans KR', marginBottom:4, lineHeight:1.5 }}>· {p}</div>)}
            </div>
            <div style={{ background:'#FDF0F0', borderRadius:10, padding:14 }}>
              <div style={{ fontSize:11, color:'#8A3A3A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:8 }}>👎 단점</div>
              {job.cons.map((c,i) => <div key={i} style={{ fontSize:13, color:'#6A2A2A', fontFamily:'Noto Sans KR', marginBottom:4, lineHeight:1.5 }}>· {c}</div>)}
            </div>
          </div>
          {job.daily_life && (
            <div style={{ background:'#F5EDD8', borderRadius:10, padding:14 }}>
              <div style={{ fontSize:11, color:'#8A6A30', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:8 }}>🌅 A day in the life</div>
              <div style={{ fontSize:13, color:'#4A3010', fontFamily:'Noto Sans KR', lineHeight:1.8, whiteSpace:'pre-line' }}>{job.daily_life}</div>
            </div>
          )}
          {job.interview_tips && (
            <div style={{ background:'#F0F4FF', borderRadius:10, padding:14, marginTop:12 }}>
              <div style={{ fontSize:11, color:'#3A4A8A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:8 }}>💡 면접 꿀팁</div>
              <div style={{ fontSize:13, color:'#2A3060', fontFamily:'Noto Sans KR', lineHeight:1.8, whiteSpace:'pre-line' }}>{job.interview_tips}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { jobs, loading, likedIds, toggleLike, addJob, updateJob } = useJobs()
  const [region, setRegion]       = useState("전체")
  const [type, setType]           = useState("전체")
  const [sort, setSort]           = useState("좋아요순")
  const [photoOnly, setPhotoOnly] = useState(false)
  const [showModal, setShowModal]               = useState(false)
  const [editJob, setEditJob]                   = useState(null)
  const [user, setUser]                         = useState(null)
  const [profile, setProfile]                   = useState(null)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt]   = useState(false)

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('nickname').eq('id', userId).single()
    if (data) setProfile(data)
    else setShowNicknameModal(true)
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
      else { setProfile(null); setShowNicknameModal(false) }
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

  const chip = (active, accent) => ({
    padding:'6px 14px', borderRadius:20, cursor:'pointer',
    fontSize:12, fontFamily:'Noto Sans KR', border:'1.5px solid',
    transition:'all 0.15s',
    background: active ? (accent || '#2C1A00') : 'transparent',
    borderColor: active ? (accent || '#2C1A00') : '#D4C5A9',
    color: active ? (accent ? '#fff' : '#FFD580') : '#8A7050',
  })

  const totalPhotos = jobs.filter(j=>j.photos?.length).reduce((a,j)=>a+j.photos.length,0)

  return (
    <div style={{ minHeight:'100vh', background:'#F7F0E3', backgroundImage:'radial-gradient(ellipse at 0% 0%,rgba(200,150,60,0.12) 0%,transparent 50%),radial-gradient(ellipse at 100% 100%,rgba(160,120,40,0.1) 0%,transparent 50%)' }}>

      {/* 헤더 */}
      <div style={{ borderBottom:'1.5px solid #E0D0B0', background:'rgba(247,240,227,0.95)', backdropFilter:'blur(8px)', position:'sticky', top:0, zIndex:50, padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:900, color:'#2C1A00' }}>🦘 호주잡</div>
          <div style={{ fontSize:10, color:'#B8A070', fontFamily:'Noto Sans KR', marginTop:2 }}>호주 워홀러들의 직업 후기</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {user ? (
            <>
              <img
                src={user.user_metadata?.avatar_url}
                alt="프로필"
                style={{ width:30, height:30, borderRadius:'50%', border:'2px solid #C8963C', objectFit:'cover' }}
                onError={e => { e.target.style.display='none' }}
              />
              <button onClick={signOut} style={{ background:'transparent', color:'#8A7050', border:'1.5px solid #D4C5A9', borderRadius:10, padding:'7px 14px', fontFamily:'Noto Sans KR', fontSize:12, cursor:'pointer' }}>
                로그아웃
              </button>
            </>
          ) : (
            <button onClick={signIn} style={{ background:'transparent', color:'#2C1A00', border:'1.5px solid #2C1A00', borderRadius:10, padding:'7px 14px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              구글로 로그인
            </button>
          )}
          <button onClick={() => user ? setShowModal(true) : setShowLoginPrompt(true)} style={{ background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:10, padding:'9px 18px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            + 후기 추가하기
          </button>
        </div>
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'0 16px 80px' }}>

        {/* 히어로 */}
        <div style={{ padding:'36px 0 28px' }}>
          <div style={{ fontSize:11, letterSpacing:'3px', color:'#C8963C', fontFamily:'Noto Sans KR', marginBottom:10, textTransform:'uppercase' }}>KOREA → AUSTRALIA</div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(28px,7vw,44px)', fontWeight:900, color:'#2C1A00', margin:'0 0 12px', lineHeight:1.15 }}>
            다음 워홀러를 위한<br />직업 리얼 후기
          </h1>
          <p style={{ color:'#8A7050', fontSize:14, fontFamily:'Noto Sans KR', lineHeight:1.8, margin:0 }}>
            시급부터 솔직한 장단점까지 — 직접 겪은 사람만 아는 정보.<br />
            <span style={{ color:'#C8963C', fontWeight:700 }}>일터 사진을 올리면 다른 사람 사진도 볼 수 있어요 📷</span>
          </p>
        </div>

        {/* 사진 유도 배너 */}
        {totalPhotos > 0 && (
          <div style={{ background:'#2C1A00', borderRadius:16, padding:24, marginBottom:24 }}>
            <div style={{ display:'flex', gap:6, marginBottom:18, height:80, opacity:0.55 }}>
              {jobs.filter(j=>j.photos?.length).slice(0,3).map((j,i) => (
                <div key={i} style={{ flex:1, overflow:'hidden', borderRadius:8 }}>
                  <img src={j.photos[0].url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
              ))}
            </div>
            <div style={{ color:'#FFD580', fontWeight:700, fontSize:15, fontFamily:'Noto Sans KR', marginBottom:6 }}>📷 일터에서 찍은 사진을 올리면</div>
            <div style={{ color:'#E0C890', fontSize:13, fontFamily:'Noto Sans KR', lineHeight:1.7, marginBottom:18 }}>
              다른 워홀러들이 올린 현장 사진도 볼 수 있어요.<br />
              <span style={{ color:'#FFD580', fontWeight:700 }}>{totalPhotos}장의 사진</span>이 기다리고 있어요.
            </div>
            <button onClick={() => user ? setShowModal(true) : setShowLoginPrompt(true)} style={{ background:'#C8963C', color:'#fff', border:'none', borderRadius:10, padding:'11px 22px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              사진 + 후기 공유하기 →
            </button>
          </div>
        )}

        {/* 통계 */}
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { label:'등록된 직업', value: loading ? '…' : jobs.length+'개' },
            { label:'총 좋아요',   value: loading ? '…' : jobs.reduce((a,j)=>a+j.likes,0)+'개' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background:'#FEFAF3', border:'1.5px solid #E0D0B0', borderRadius:12, padding:'12px 18px', flex:1, minWidth:90 }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'#2C1A00' }}>{value}</div>
              <div style={{ fontSize:11, color:'#A08060', fontFamily:'Noto Sans KR' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* 필터 */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            {REGIONS.map(r => <button key={r} onClick={() => setRegion(r)} style={chip(region===r)}>{r}</button>)}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            {TYPES.map(t => <button key={t} onClick={() => setType(t)} style={chip(type===t)}>{t}</button>)}
            <button onClick={() => setPhotoOnly(p=>!p)} style={chip(photoOnly, '#C8963C')}>📷 사진만</button>
            <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
              {["좋아요순","별점순","시급순","최신순"].map(s => <button key={s} onClick={() => setSort(s)} style={{ ...chip(sort===s), fontSize:11 }}>{s}</button>)}
            </div>
          </div>
        </div>

        <div style={{ fontSize:12, color:'#B8A070', fontFamily:'Noto Sans KR', marginBottom:16 }}>
          {loading ? '불러오는 중…' : `${filtered.length}개 결과 · 카드 클릭하면 장단점 펼쳐져요`}
        </div>

        {/* 카드 목록 */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {filtered.map(job => (
            <JobCard key={job.id} job={job} liked={likedIds.includes(job.id)} onLike={toggleLike} user={user} onEdit={setEditJob} />
          ))}
        </div>

        {/* 하단 CTA */}
        <div style={{ marginTop:32, textAlign:'center', background:'#FEFAF3', border:'1.5px dashed #D4C5A9', borderRadius:16, padding:'28px 24px' }}>
          <div style={{ fontSize:22, marginBottom:8 }}>✍️</div>
          <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:'#6A5030', marginBottom:6, lineHeight:1.7 }}>
            직업 후기 + 현장 사진으로<br />다음 워홀러 도와주기
          </div>
          <div style={{ fontSize:12, color:'#B8A070', fontFamily:'Noto Sans KR', marginBottom:16 }}>사진은 선택사항이에요</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => user ? setShowModal(true) : setShowLoginPrompt(true)} style={{ background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:10, padding:'11px 24px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              후기 + 사진 공유하기 →
            </button>
          </div>
        </div>
      </div>

      {showNicknameModal && user && (
        <NicknameModal user={user} onSave={nick => { setProfile({ nickname: nick }); setShowNicknameModal(false) }} />
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
        />
      )}
    </div>
  )
}
