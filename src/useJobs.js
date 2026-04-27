import { useState, useEffect } from 'react'

// 구글 시트 ID를 .env 파일에서 읽어옴
// VITE_SHEET_ID=your_sheet_id 형태로 설정
const SHEET_ID = import.meta.env.VITE_SHEET_ID

// 구글 시트 컬럼 순서 (폼 제출 순서와 동일하게 맞춰야 함)
// A: 타임스탬프, B: 직업명, C: 회사, D: 지역, E: 고용형태,
// F: 시급, G: 시프트, H: 한줄평, I: 장점, J: 단점, K: 별점, L: 닉네임, M: 사진URL(선택)
function parseRow(row, index) {
  const get = (i) => (row[i] || '').toString().trim()
  return {
    id: index,
    date: get(0).slice(0, 7).replace('/', '-'),
    title: get(1),
    company: get(2) || '비공개',
    region: get(3),
    type: get(4),
    hourly: Number(get(5)) || 0,
    shift: get(6),
    review: get(7),
    pros: get(8).split(/[,\n·]/).map(s => s.trim()).filter(Boolean),
    cons: get(9).split(/[,\n·]/).map(s => s.trim()).filter(Boolean),
    stars: Number(get(10)) || 3,
    author: get(11) || '익명',
    // 사진: 구글 드라이브 공유 URL들을 쉼표로 구분해서 입력받음
    photos: get(12)
      ? get(12).split(',').map(url => ({
          url: driveUrl(url.trim()),
          caption: ''
        })).filter(p => p.url)
      : [],
    tag: inferTag(get(1), get(3)),
  }
}

// 구글 드라이브 공유 링크 → 직접 이미지 URL로 변환
function driveUrl(url) {
  if (!url) return ''
  const match = url.match(/[-\w]{25,}/)
  return match ? `https://drive.google.com/uc?export=view&id=${match[0]}` : url
}

function inferTag(title, region) {
  const t = title.toLowerCase()
  if (t.includes('barista') || t.includes('cafe') || t.includes('coffee')) return '카페'
  if (t.includes('farm') || t.includes('fruit') || t.includes('harvest')) return '농장'
  if (t.includes('kitchen') || t.includes('cook') || t.includes('chef')) return '주방'
  if (t.includes('construction') || t.includes('labour') || t.includes('builder')) return '건설'
  if (t.includes('retail') || t.includes('shop') || t.includes('store')) return '리테일'
  if (region.toLowerCase().includes('fifo') || region.toLowerCase().includes('mine')) return '광산'
  return '기타'
}

export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!SHEET_ID) {
      // SHEET_ID 없으면 샘플 데이터로 fallback
      setJobs(SAMPLE_JOBS)
      setLoading(false)
      return
    }

    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Sheet1`

    fetch(url)
      .then(r => r.text())
      .then(text => {
        // 구글 시트 응답은 JSON 앞뒤에 래퍼가 붙어있음
        const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
        const rows = json.table.rows.map(r => r.c.map(c => c?.v ?? ''))
        const parsed = rows
          .slice(1) // 헤더 행 제거
          .map((row, i) => parseRow(row, i + 1))
          .filter(j => j.title) // 빈 행 제거
        setJobs(parsed)
      })
      .catch(e => {
        console.error('시트 로딩 실패, 샘플 데이터 사용:', e)
        setJobs(SAMPLE_JOBS)
        setError(e)
      })
      .finally(() => setLoading(false))
  }, [])

  return { jobs, loading, error }
}

// SHEET_ID 없을 때 보여줄 샘플 데이터
export const SAMPLE_JOBS = [
  {
    id: 1, title: "Service Attendant", company: "Sodexo", region: "WA · FIFO",
    type: "Casual", hourly: 33, shift: "12h 주/야간 교대",
    review: "통장은 든든하지만 사막에서 혼자 사는 느낌",
    pros: ["시급 높음", "숙식 무료 제공", "저축 엄청 빠름"],
    cons: ["소셜 생활 제로", "외딴 사이트", "핸드폰 신호 없음"],
    stars: 4, author: "Keith", date: "2024-11", tag: "광산",
    photos: [
      { url: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80", caption: "광산 전경" },
      { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80", caption: "퇴근 후 노을" },
    ]
  },
  {
    id: 2, title: "Barista", company: "개인 카페", region: "VIC · Melbourne CBD",
    type: "Casual", hourly: 26, shift: "아침 6시 ~ 오후 2시",
    review: "영어 실력이 제일 빨리 늘었던 직업, 팁도 쏠쏠",
    pros: ["영어 향상 확실", "팁 수입", "도심 생활"],
    cons: ["아침 일찍", "주말 필수 출근", "발바닥 통증"],
    stars: 4, author: "지현", date: "2024-09", tag: "카페",
    photos: [
      { url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80", caption: "우리 카페 아침" },
    ]
  },
  {
    id: 3, title: "Farm Worker", company: "블루베리 농장", region: "QLD · Bundaberg",
    type: "Casual", hourly: 21, shift: "새벽 5시 ~ 오후 1시",
    review: "세컨비자 조건 채우기엔 최적, 몸은 그냥 최악",
    pros: ["2nd 비자 조건 충족", "숙소 제공", "생활비 거의 없음"],
    cons: ["무더위 40도", "허리 완전 나감", "벌레 천국"],
    stars: 2, author: "민준", date: "2024-06", tag: "농장",
    photos: []
  },
  {
    id: 4, title: "Construction Labourer", company: "건설사", region: "WA · Perth",
    type: "Casual", hourly: 35, shift: "아침 6시 ~ 오후 3시",
    review: "체력만 되면 호주에서 이만한 캐주얼 없음",
    pros: ["최상위 시급", "세컨비자 가능", "체력 좋아짐"],
    cons: ["위험할 수 있음", "날씨 영향 큼", "초반 취업 어려움"],
    stars: 5, author: "현우", date: "2024-07", tag: "건설",
    photos: [
      { url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80", caption: "현장 전경" },
    ]
  },
]
