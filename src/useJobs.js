import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [likedIds, setLikedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('liked_ids') || '[]') } catch { return [] }
  })

  const deviceId = (() => {
    let id = localStorage.getItem('device_id')
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now()
      localStorage.setItem('device_id', id)
    }
    return id
  })()

  const fetchJobs = async () => {
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: likesData } = await supabase
      .from('likes')
      .select('job_id')

    if (jobsData) {
      const counts = {}
      if (likesData) {
        likesData.forEach(row => {
          counts[row.job_id] = (counts[row.job_id] || 0) + 1
        })
      }
      const parsed = jobsData.map(job => ({
        ...job,
        likes: counts[job.id] || 0,
        pros: (job.pros || '').split('\n').filter(Boolean),
        cons: (job.cons || '').split('\n').filter(Boolean),
        photos: job.photos
          ? job.photos.split(',').map(url => ({ url: url.trim(), caption: '' })).filter(p => p.url)
          : [],
        tag: job.tag || inferTag(job.title, job.region),
      }))
      setJobs(parsed)
    }
    setLoading(false)
  }

  useEffect(() => { fetchJobs() }, [])

  const addJob = async (jobData) => {
    const { error } = await supabase.from('jobs').insert(jobData)
    if (!error) fetchJobs()
    return !error
  }

  const updateJob = async (id, jobData) => {
    const { error } = await supabase.from('jobs').update(jobData).eq('id', id)
    if (!error) fetchJobs()
    return !error
  }

  const toggleLike = async (jobId) => {
    const alreadyLiked = likedIds.includes(jobId)
    if (alreadyLiked) {
      await supabase.from('likes').delete().eq('job_id', jobId).eq('device_id', deviceId)
      const newIds = likedIds.filter(id => id !== jobId)
      setLikedIds(newIds)
      localStorage.setItem('liked_ids', JSON.stringify(newIds))
    } else {
      await supabase.from('likes').insert({ job_id: jobId, device_id: deviceId })
      const newIds = [...likedIds, jobId]
      setLikedIds(newIds)
      localStorage.setItem('liked_ids', JSON.stringify(newIds))
    }
    setJobs(prev => prev.map(job =>
      job.id === jobId
        ? { ...job, likes: alreadyLiked ? job.likes - 1 : job.likes + 1 }
        : job
    ))
  }

  return { jobs, loading, likedIds, toggleLike, addJob, updateJob }
}

function inferTag(title, region) {
  const t = (title || '').toLowerCase()
  const r = (region || '').toLowerCase()
  if (t.includes('barista') || t.includes('cafe') || t.includes('coffee') || t.includes('waiter') || t.includes('waitress') || t.includes('barman') || t.includes('bartender') || t.includes('bar ') || t.includes('pub') || t.includes('restaurant') || t.includes('hospitality')) return '카페'
  if (t.includes('farm') || t.includes('fruit') || t.includes('harvest') || t.includes('picker') || t.includes('packing') || t.includes('orchard') || t.includes('vineyard') || t.includes('crop')) return '농장'
  if (t.includes('kitchen') || t.includes('cook') || t.includes('chef') || t.includes('dish') || t.includes('food prep')) return '주방'
  if (t.includes('construction') || t.includes('labour') || t.includes('builder') || t.includes('carpenter') || t.includes('electrician') || t.includes('plumber') || t.includes('scaffold') || t.includes('labor')) return '건설'
  if (t.includes('retail') || t.includes('shop') || t.includes('store') || t.includes('cashier') || t.includes('supermarket') || t.includes('checkout') || t.includes('sales')) return '리테일'
  if (r.includes('fifo') || r.includes('mine') || r.includes('광산') || t.includes('mine') || t.includes('mining') || t.includes('driller') || t.includes('operator')) return '광산'
  if (t.includes('driver') || t.includes('delivery') || t.includes('rider') || t.includes('courier') || t.includes('truck') || t.includes('forklift') || t.includes('cleaner') || t.includes('cleaning') || t.includes('housekeeper') || t.includes('housekeeping') || t.includes('care') || t.includes('hotel') || t.includes('resort') || t.includes('motel') || t.includes('receptionist') || t.includes('front desk') || t.includes('attendant') || t.includes('service') || t.includes('laundry') || t.includes('pedicab')) return '서비스'
  return '기타'
}
