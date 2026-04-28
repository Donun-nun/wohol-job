import { useState } from 'react'
import { useJobs } from './useJobs'

const TAG_COLORS = {
  "광산": ["#7C4A00", "#FFD580"],
  "카페": ["#1A3A2A", "#7FFFC4"],
  "농장": ["#2A3A00", "#C8FF80"],
  "주방": ["#3A1A00", "#FFA87F"],
  "리테일": ["#001A3A", "#80C8FF"],
  "건설": ["#2A0038", "#E080FF"],
  "기타":  ["#2A2A2A", "#D0D0D0"],
}

const REGIONS = ["전체", "WA", "VIC", "NSW", "QLD", "SA", "NT"]
const TYPES   = ["전체", "Casual", "Part-time", "Full-time"]

const CLOUDINARY_CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

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
            {p.caption && (
              <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent,rgba(0,0,0,0.55))', color:'#fff', fontSize:11, padding:'12px 8px 6px', fontFamily:'Noto Sans KR' }}>{p.caption}</div>
            )}
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

// 사진 업로드 함수
async function uploadPhoto(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  return data.secure_url
}

// 사진 업로드 컴포넌트
function PhotoUploader({ photos, setPhotos }) {
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(files.map(f => uploadPhoto(f)))
      setPhotos(prev => [...prev, ...urls.map(url => ({ url, caption: '' }))])
    } catch {
      alert('사진 업로드 실패했어요. 다시 시도해주세요.')
    }
    setUploading(false)
  }

  return (
    <div>
      <div style={{ fontSize:12, color:'#9A7A50', fontFamily:'Noto Sans KR', marginBottom:8 }}>
        📷 현장 사진 (선택) — 있으면 후기가 훨씬 생생해져요
      </div>

      {/* 업로드된 사진 미리보기 */}
      {photos.length > 0 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position:'relative', width:80, height:80 }}>
              <img src={p.url} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8, border:'1.5px solid #E0D0B0' }} />
              <button
                onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                style={{ position:'absolute', top:-6, right:-6, background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* 업로드 버튼 */}
      <label style={{
        display:'inline-block', cursor:'pointer',
        background: uploading ? 'rgba(0,0,0,0.04)' : 'rgba(200,150,60,0.08)',
        border:'1.5px dashed #C8963C', borderRadius:10,
        padding:'10px 20px', fontFamily:'Noto Sans KR', fontSize:13, color:'#C8963C',
      }}>
        {uploading ? '업로드 중...' : '📷 사진 선택하기'}
        <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ display:'none' }} disabled={uploading} />
      </label>
      <div style={{ fontSize:11, color:'#B8A070', fontFamily:'Noto Sans KR', marginTop:6 }}>
        여러 장 동시에 선택 가능 · 로그인 불필요
      </div>
    </div>
  )
}

// 후기 작성 모달
function SubmitModal({ onClose }) {
  const FORM_URL = import.meta.env.VITE_FORM_URL
  const [photos, setPhotos] = useState([])
  const [step, setStep] = useState(1) // 1: 폼작성, 2: 사진업로드

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#FEFAF3', borderRadius:20, padding:28, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'#2C1A00' }}>후기 공유하기</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#999' }}>✕</button>
        </div>

        {step === 1 && (
          <div>
            <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:'#6A5030', lineHeight:1.8, marginBottom:20 }}>
              아래 버튼을 눌러 구글 폼에서 후기를 작성해주세요.<br />
              작성 완료 후 돌아와서 사진도 올릴 수 있어요 📷
            </div>
            <button
              onClick={() => { window.open(FORM_URL, '_blank'); setStep(2) }}
              style={{ width:'100%', background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:10, padding:'13px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer', marginBottom:10 }}>
              ✍️ 구글 폼에서 후기 작성하기 →
            </button>
            <button onClick={() => setStep(2)} style={{ width:'100%', background:'transparent', color:'#9A7A50', border:'1.5px solid #E0D0B0', borderRadius:10, padding:'11px', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer' }}>
              이미 작성했어요 — 사진만 올릴게요
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontFamily:'Noto Sans KR', fontSize:14, color:'#6A5030', lineHeight:1.8, marginBottom:20 }}>
              일터에서 찍은 사진을 올려주세요.<br />
              <span style={{ color:'#C8963C', fontWeight:700 }}>사진은 선택사항이에요.</span> 없어도 괜찮아요!
            </div>
            <PhotoUploader photos={photos} setPhotos={setPhotos} />
            {photos.length > 0 && (
              <div style={{ marginTop:16, background:'rgba(99,180,100,0.08)', border:'1.5px solid rgba(99,180,100,0.3)', borderRadius:10, padding:'12px 16px', fontFamily:'Noto Sans KR', fontSize:13, color:'#3A7A3A' }}>
                ✅ 사진 {photos.length}장 업로드 완료! 관리자가 확인 후 게시돼요.
              </div>
            )}
            <button onClick={onClose} style={{ width:'100%', marginTop:16, background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:10, padding:'13px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              완료 🎉
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function JobCard({ job, liked, onLike }) {
  const [open, setOpen] = useState(false)
  const [tc, tb] = TAG_COLORS[job.tag] || TAG_COLORS["기타"]
  const hasPhotos = job.photos?.length > 0

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{ background:'#FEFAF3', border:'1.5px solid #E8DCC8', borderRadius:16, overflow:'hidden', cursor:'pointer', transition:'box-shadow 0.18s, transform 0.18s', position:'relative', boxShadow:'0 2px 8px rgba(120,90,40,0.07)' }}
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
            <div style={{ fontSize:11, color:'#B8A080', fontFamily:'Noto Sans KR' }}>{job.shift} · {job.author} · {job.date}</div>
            <button
              onClick={e => { e.stopPropagation(); onLike(job.id) }}
              style={{ display:'flex', alignItems:'center', gap:4, background: liked ? 'rgba(200,150,60,0.15)' : 'rgba(0,0,0,0.04)', border:`1.5px solid ${liked ? '#C8963C' : '#E0D0B0'}`, borderRadius:20, padding:'4px 12px', cursor:'pointer', fontFamily:'Noto Sans KR', fontSize:13, color: liked ? '#C8963C' : '#A08060', transition:'all 0.15s' }}>
              <span>{liked ? '❤️' : '🤍'}</span>
              <span>{job.likes}</span>
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div style={{ borderTop:'1.5px solid #E8DCC8', padding:'16px 20px 20px', background:'#FFFDF8' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ background:'#F0F9F0', borderRadius:10, padding:14 }}>
              <div style={{ fontSize:11, color:'#3A7A3A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:8 }}>👍 장점</div>
              {job.pros.map((p,i) => <div key={i} style={{ fontSize:13, color:'#2A5A2A', fontFamily:'Noto Sans KR', marginBottom:4, lineHeight:1.5 }}>· {p}</div>)}
            </div>
            <div style={{ background:'#FDF0F0', borderRadius:10, padding:14 }}>
              <div style={{ fontSize:11, color:'#8A3A3A', fontFamily:'Noto Sans KR', fontWeight:700, marginBottom:8 }}>👎 단점</div>
              {job.cons.map((c,i) => <div key={i} style={{ fontSize:13, color:'#6A2A2A', fontFamily:'Noto Sans KR', marginBottom:4, lineHeight:1.5 }}>· {c}</div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { jobs, loading, likedIds, toggleLike } = useJobs()
  const [region, setRegion]       = useState("전체")
  const [type, setType]           = useState("전체")
  const [sort, setSort]           = useState("좋아요순")
  const [photoOnly, setPhotoOnly] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const SHEET_ID = import.meta.env.VITE_SHEET_ID

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
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setShowModal(true)} style={{ background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:10, padding:'9px 18px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            + 후기 추가하기
          </button>
          <button onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${SHEET_ID}`, '_blank')} style={{ background:'transparent', color:'#2C1A00', border:'1.5px solid #2C1A00', borderRadius:10, padding:'9px 18px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            📊 시트
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
            <button onClick={() => setShowModal(true)} style={{ background:'#C8963C', color:'#fff', border:'none', borderRadius:10, padding:'11px 22px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              사진 + 후기 공유하기 →
            </button>
          </div>
        )}

        {/* 통계 */}
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { label:'등록된 직업', value: loading ? '…' : jobs.length+'개' },
            { label:'평균 시급',   value: loading ? '…' : '$'+Math.round(jobs.reduce((a,j)=>a+j.hourly,0)/Math.max(jobs.length,1)) },
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
            <JobCard key={job.id} job={job} liked={likedIds.includes(job.id)} onLike={toggleLike} />
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
            <button onClick={() => setShowModal(true)} style={{ background:'#2C1A00', color:'#FFD580', border:'none', borderRadius:10, padding:'11px 24px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              후기 + 사진 공유하기 →
            </button>
            <button onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${SHEET_ID}`, '_blank')} style={{ background:'transparent', color:'#2C1A00', border:'1.5px solid #2C1A00', borderRadius:10, padding:'11px 24px', fontFamily:'Noto Sans KR', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              📊 시트에서 직접 추가
            </button>
          </div>
        </div>
      </div>

      {/* 후기 작성 모달 */}
      {showModal && <SubmitModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
