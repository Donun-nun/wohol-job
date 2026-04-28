import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const SHEET_ID = import.meta.env.VITE_SHEET_ID
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

function inferTag(title, region) {
  const t = (title || '').toLowerCase()
  const r = (region || '').toLowerCase()
  if (t.includes('barista') || t.includes('cafe') || t.includes('coffee')) return '카페'
  if (t.includes('farm') || t.includes('fruit') || t.includes('harvest')) return '농장'
  if (t.includes('kitchen') || t.includes('cook') || t.includes('chef')) return '주방'
  if (t.includes('construction') || t.includes('labour') || t.includes('builder')) return '건설'
  if (t.includes('retail') || t.includes('shop') || t.includes('store')) return '리테일'
  if (r.includes('fifo') || r.includes('mine') || r.includes('광산')) return '광산'
  return '기타'
}

function driveUrl(url) {
  if (!url) return ''
  const match = url.match(/[-\w]{25,}/)
  return match ? `https://drive.google.com/uc?export=view&id=${match[0]}` : url
}

function parseRow(row, index) {
  const get = (i) => {
    const cell = row[i]
    if (!cell || cell.v === null || cell.v === undefined) return ''
    return cell.v.toString().trim()
  }
  const getNum = (i) => {
    const cell = row[i]
    if (!cell || cell.v === null) return 0
    return Number(cell.v) || 0
  }
  return {
    id: index,
    date: get(0).slice(0, 7),
    title: get(1),
    company: get(2) || '비공개',
    region: get(3),
    type: get(4),
    hourly: getNum(5),
    shift: get(6),
    review: get(7),
    pros: get(8).split(/[\n·,]/).map(s => s.trim()).filter(Boolean),
    cons: get(9).split(/[\n·,]/).map(s => s.trim()).filter(Boolean),
    stars: getNum(10),
    author: get(11) || '익명',
    photos: get(12)
      ? get(12).split(',').map(url => ({ url: driveUrl(url.trim()), caption: '' })).filter(p => p.url)
      : [],
    tag: inferTag(get(1), get(3)),
    likes: 0,
  }
}

export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [likedIds, setLikedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('liked_ids') || '[]') } catch { return [] }
  })

  // 기기 고유 ID (없으면 새로 만들어서 저장)
  const deviceId = (() => {
    let id = localStorage.getItem('device_id')
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now()
      localStorage.setItem('device_id', id)
    }
    return id
  })()

  useEffect(() => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Form+Responses+1`
    fetch(url)
      .then(r => r.text())
      .then(async text => {
        const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
        const rows = json.table.rows
        const parsed = rows
          .map((row, i) => parseRow(row.c, i + 1))
          .filter(j => j.title)

        // Supabase에서 좋아요 수 가져오기
        const { data: likesData } = await supabase
          .from('likes')
          .select('job_id')

        if (likesData) {
          const counts = {}
          likesData.forEach(row => {
            counts[row.job_id] = (counts[row.job_id] || 0) + 1
          })
          parsed.forEach(job => { job.likes = counts[job.id] || 0 })
        }

        setJobs(parsed)
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleLike = async (jobId) => {
    const alreadyLiked = likedIds.includes(jobId)

    if (alreadyLiked) {
      // 좋아요 취소
      await supabase.from('likes').delete()
        .eq('job_id', jobId).eq('device_id', deviceId)
      const newLikedIds = likedIds.filter(id => id !== jobId)
      setLikedIds(newLikedIds)
      localStorage.setItem('liked_ids', JSON.stringify(newLikedIds))
    } else {
      // 좋아요 추가
      await supabase.from('likes').insert({ job_id: jobId, device_id: deviceId })
      const newLikedIds = [...likedIds, jobId]
      setLikedIds(newLikedIds)
      localStorage.setItem('liked_ids', JSON.stringify(newLikedIds))
    }

    // 화면 업데이트
    setJobs(prev => prev.map(job =>
      job.id === jobId
        ? { ...job, likes: alreadyLiked ? job.likes - 1 : job.likes + 1 }
        : job
    ))
  }

  return { jobs, loading, likedIds, toggleLike }
}

export const SAMPLE_JOBS = []
