import { useState, useEffect } from 'react'

const SHEET_ID = import.meta.env.VITE_SHEET_ID

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
    if (!cell) return ''
    if (cell.v === null || cell.v === undefined) return ''
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
  }
}

export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!SHEET_ID) {
      setJobs(SAMPLE_JOBS)
      setLoading(false)
      return
    }

    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Form+Responses+1`

    fetch(url)
      .then(r => r.text())
      .then(text => {
        const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
        const rows = json.table.rows
        const parsed = rows
          .map((row, i) => parseRow(row.c, i + 1))
          .filter(j => j.title)
        setJobs(parsed)
      })
      .catch(() => setJobs(SAMPLE_JOBS))
      .finally(() => setLoading(false))
  }, [])

  return { jobs, loading }
}

export const SAMPLE_JOBS = []
