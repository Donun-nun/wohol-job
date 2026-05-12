import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useJobs(user) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [likedIds, setLikedIds] = useState([])

  const deviceId = (() => {
    let id = localStorage.getItem('device_id')
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now()
      localStorage.setItem('device_id', id)
    }
    return id
  })()

  const fetchJobs = async () => {
    const [{ data: jobsData }, { data: profilesData }] = await Promise.all([
      supabase.from('jobs').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, nickname'),
    ])

    // Fetch likes count separately (all likes)
    const { data: allLikesData } = await supabase.from('likes').select('job_id')

    // Fetch which jobs this user/device has liked
    let myLikesData = []
    if (user?.id) {
      const { data } = await supabase.from('likes').select('job_id').eq('user_id', user.id)
      myLikesData = data || []
    } else {
      const { data } = await supabase.from('likes').select('job_id').eq('device_id', deviceId).is('user_id', null)
      myLikesData = data || []
    }

    const myLikedIds = myLikesData.map(r => r.job_id)
    setLikedIds(myLikedIds)
    if (!user?.id) {
      localStorage.setItem('liked_ids', JSON.stringify(myLikedIds))
    }

    if (jobsData) {
      const counts = {}
      if (allLikesData) allLikesData.forEach(row => { counts[row.job_id] = (counts[row.job_id] || 0) + 1 })
      const nicknameMap = {}
      if (profilesData) profilesData.forEach(p => { nicknameMap[p.id] = p.nickname })

      const parsed = jobsData.map(job => ({
        ...job,
        likes: counts[job.id] || 0,
        pros: (job.pros || '').split('\n').filter(Boolean),
        cons: (job.cons || '').split('\n').filter(Boolean),
        photos: (() => {
          if (!job.photos) return []
          const s = job.photos.trim()
          if (s.startsWith('[')) {
            try { return JSON.parse(s) } catch {}
          }
          return s.split(',').map(url => ({ url: url.trim(), caption: '' })).filter(p => p.url)
        })(),
        tags: (() => {
          const TAG_MAP = { '광산':'Mining','카페':'Cafe','농장':'Farm','주방':'Kitchen','건설':'Construction','서비스':'Service','물류':'Logistics','기타':'Other' }
          const norm = (t) => TAG_MAP[t] || t
          const raw = job.tag || ''
          if (!raw) return [norm(inferTag(job.title, job.region))].filter(t => t && t !== 'Other')
          if (raw.trim().startsWith('[')) { try { return JSON.parse(raw).map(norm) } catch {} }
          return [norm(raw)]
        })(),
        author: job.user_id ? (nicknameMap[job.user_id] || 'Unknown') : (job.author || 'Anonymous'),
      }))
      setJobs(parsed)
    }
    setLoading(false)
  }

  useEffect(() => { fetchJobs() }, [user?.id])

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

  const incrementView = async (id) => {
    await supabase.rpc('increment_view', { job_id: id })
    setJobs(prev => prev.map(j => j.id === id ? { ...j, views: (j.views || 0) + 1 } : j))
  }

  const toggleLike = async (jobId) => {
    const alreadyLiked = likedIds.includes(jobId)

    if (alreadyLiked) {
      if (user?.id) {
        await supabase.from('likes').delete().eq('job_id', jobId).eq('user_id', user.id)
      } else {
        await supabase.from('likes').delete().eq('job_id', jobId).eq('device_id', deviceId).is('user_id', null)
      }
      const newIds = likedIds.filter(id => id !== jobId)
      setLikedIds(newIds)
      if (!user?.id) localStorage.setItem('liked_ids', JSON.stringify(newIds))
    } else {
      if (user?.id) {
        await supabase.from('likes').insert({ job_id: jobId, user_id: user.id })
      } else {
        await supabase.from('likes').insert({ job_id: jobId, device_id: deviceId })
      }
      const newIds = [...likedIds, jobId]
      setLikedIds(newIds)
      if (!user?.id) localStorage.setItem('liked_ids', JSON.stringify(newIds))
    }

    setJobs(prev => prev.map(job =>
      job.id === jobId
        ? { ...job, likes: alreadyLiked ? job.likes - 1 : job.likes + 1 }
        : job
    ))
  }

  return { jobs, loading, likedIds, toggleLike, addJob, updateJob, incrementView }
}

function inferTag(title, region) {
  const t = (title || '').toLowerCase()
  const r = (region || '').toLowerCase()
  if (t.includes('barista') || t.includes('cafe') || t.includes('coffee') || t.includes('waiter') || t.includes('waitress') || t.includes('barman') || t.includes('bartender') || t.includes('bar ') || t.includes('pub') || t.includes('restaurant') || t.includes('hospitality')) return 'Cafe'
  if (t.includes('farm') || t.includes('fruit') || t.includes('harvest') || t.includes('picker') || t.includes('packing') || t.includes('orchard') || t.includes('vineyard') || t.includes('crop')) return 'Farm'
  if (t.includes('kitchen') || t.includes('cook') || t.includes('chef') || t.includes('dish') || t.includes('food prep')) return 'Kitchen'
  if (t.includes('construction') || t.includes('labour') || t.includes('builder') || t.includes('carpenter') || t.includes('electrician') || t.includes('plumber') || t.includes('scaffold') || t.includes('labor')) return 'Construction'
  if (t.includes('retail') || t.includes('shop') || t.includes('store') || t.includes('cashier') || t.includes('supermarket') || t.includes('checkout') || t.includes('sales')) return 'Service'
  if (r.includes('fifo') || r.includes('mine') || r.includes('광산') || t.includes('mine') || t.includes('mining') || t.includes('driller') || t.includes('operator')) return 'Mining'
  if (t.includes('pick packer') || t.includes('pickpacker') || t.includes('warehouse') || t.includes('forklift') || t.includes('packer') || t.includes('picker') && (t.includes('warehouse') || t.includes('pack')) || t.includes('logistics') || t.includes('dispatch') || t.includes('inventory')) return 'Logistics'
  if (t.includes('driver') || t.includes('delivery') || t.includes('rider') || t.includes('courier') || t.includes('truck') || t.includes('cleaner') || t.includes('cleaning') || t.includes('housekeeper') || t.includes('housekeeping') || t.includes('care') || t.includes('hotel') || t.includes('resort') || t.includes('motel') || t.includes('receptionist') || t.includes('front desk') || t.includes('attendant') || t.includes('service') || t.includes('laundry') || t.includes('pedicab')) return 'Service'
  return 'Other'
}
