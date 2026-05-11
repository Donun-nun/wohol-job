import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useCampReviews(user) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('camp_reviews')
      .select('*')
      .order('created_at', { ascending: false })

    if (!data?.length) { setReviews([]); setLoading(false); return }

    const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))]
    let nickMap = {}
    if (userIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, nickname').in('id', userIds)
      if (profiles) profiles.forEach(p => { nickMap[p.id] = p.nickname })
    }

    setReviews(data.map(r => ({
      ...r,
      pros: (r.pros || '').split('\n').filter(Boolean),
      cons: (r.cons || '').split('\n').filter(Boolean),
      nickname: r.user_id ? (nickMap[r.user_id] || '알 수 없음') : '익명',
    })))
    setLoading(false)
  }

  useEffect(() => { fetchReviews() }, [])

  const addReview = async (formData) => {
    const { error } = await supabase.from('camp_reviews').insert({ ...formData, user_id: user?.id || null })
    if (!error) await fetchReviews()
    return !error
  }

  const deleteReview = async (id) => {
    await supabase.from('camp_reviews').delete().eq('id', id)
    await fetchReviews()
  }

  return { reviews, loading, addReview, deleteReview }
}
