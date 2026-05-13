import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const ADMIN_EMAIL = 'dkfldnfktyd@gmail.com'

export function useAccess(user, jobs) {
  const [hasPosted, setHasPosted] = useState(false)
  const [payslipApproved, setPayslipApproved] = useState(false)
  const [payslipPending, setPayslipPending] = useState(false)
  const [photoCreditUsed, setPhotoCreditUsed] = useState(0)
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (!user) { setHasPosted(false); setPayslipApproved(false); setPayslipPending(false); setPhotoCreditUsed(0); setLoading(false); return }
    const fetch = async () => {
      const [
        { count: jobCount },
        { data: profile },
        { data: payslips },
      ] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('profiles').select('payslip_approved, photo_credits_used').eq('id', user.id).single(),
        supabase.from('payslips').select('status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
      ])
      setHasPosted((jobCount || 0) > 0)
      setPayslipApproved(profile?.payslip_approved || false)
      setPhotoCreditUsed(profile?.photo_credits_used || 0)
      const latest = payslips?.[0]
      setPayslipPending(latest?.status === 'pending')
      setLoading(false)
    }
    fetch()
  }, [user?.id])

  const ownPhotosCount = jobs.filter(j => j.user_id === user?.id).reduce((sum, j) => sum + (j.photos?.length || 0), 0)
  const photoCreditsEarned = ownPhotosCount * 10
  const photoCreditsBalance = photoCreditsEarned - photoCreditUsed

  const hasAccess = isAdmin || hasPosted || payslipApproved || photoCreditsBalance > 0

  const consumePhotoCredit = async (count = 1) => {
    if (!user || hasPosted || payslipApproved || isAdmin) return
    const newUsed = photoCreditUsed + count
    setPhotoCreditUsed(newUsed)
    await supabase.from('profiles').update({ photo_credits_used: newUsed }).eq('id', user.id)
  }

  const uploadPayslip = async (fileUrl) => {
    const { error } = await supabase.from('payslips').insert({ user_id: user.id, file_url: fileUrl, status: 'pending' })
    if (!error) setPayslipPending(true)
    return !error
  }

  return { hasAccess, hasPosted, payslipApproved, payslipPending, photoCreditsBalance, photoCreditsEarned, isAdmin, loading, uploadPayslip, consumePhotoCredit }
}

export async function fetchPendingPayslips() {
  const { data } = await supabase
    .from('payslips')
    .select('id, user_id, file_url, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (!data?.length) return []
  const userIds = data.map(p => p.user_id)
  const { data: profiles } = await supabase.from('profiles').select('id, nickname').in('id', userIds)
  const nickMap = {}
  if (profiles) profiles.forEach(p => { nickMap[p.id] = p.nickname })
  return data.map(p => ({ ...p, nickname: nickMap[p.user_id] || 'Unknown' }))
}

export async function approvePayslip(payslipId, userId) {
  await supabase.from('payslips').update({ status: 'approved' }).eq('id', payslipId)
  await supabase.from('profiles').update({ payslip_approved: true }).eq('id', userId)
}

export async function rejectPayslip(payslipId) {
  await supabase.from('payslips').update({ status: 'rejected' }).eq('id', payslipId)
}
