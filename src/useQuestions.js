import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useQuestions() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })

    if (!data?.length) { setQuestions([]); setLoading(false); return }

    const userIds = [...new Set(data.map(q => q.user_id).filter(Boolean))]
    let nickMap = {}
    if (userIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, nickname').in('id', userIds)
      if (profiles) profiles.forEach(p => { nickMap[p.id] = p.nickname })
    }

    setQuestions(data.map(q => ({
      ...q,
      nickname: q.user_id ? (nickMap[q.user_id] || 'Unknown') : 'Anonymous',
    })))
    setLoading(false)
  }

  useEffect(() => { fetchQuestions() }, [])

  const addQuestion = async ({ content, region, tag, userId }) => {
    const { error } = await supabase.from('questions').insert({
      content, region: region || null, tag: tag || null, user_id: userId,
    })
    if (!error) await fetchQuestions()
    return !error
  }

  const deleteQuestion = async (id) => {
    await supabase.from('questions').delete().eq('id', id)
    await fetchQuestions()
  }

  return { questions, loading, addQuestion, deleteQuestion, fetchQuestions }
}
