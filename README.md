# 🦘 워홀잡 — 배포 가이드

## 전체 흐름

구글 폼 → 구글 시트 → 이 웹사이트 (Vercel)

---

## STEP 1 — 구글 폼 + 시트 준비

아직 안 했으면 `워홀DB_세팅가이드.md` 먼저 참고

완료되면:
- 구글 시트 URL에서 ID 복사
  `https://docs.google.com/spreadsheets/d/[이게 ID]/edit`
- 구글 폼 링크 복사

---

## STEP 2 — GitHub에 올리기

1. https://github.com 에서 새 저장소(repository) 만들기
   - 이름: `wohol-job`
   - Public 선택
   - "Add a README" 체크 해제

2. 터미널에서:
```bash
cd woholJob
npm install
git init
git add .
git commit -m "첫 배포"
git remote add origin https://github.com/[내아이디]/wohol-job.git
git push -u origin main
```

---

## STEP 3 — Vercel 배포

1. https://vercel.com 접속 → GitHub로 로그인
2. "Add New Project" → wohol-job 저장소 선택
3. **Environment Variables** 섹션에서 두 가지 추가:

| Key | Value |
|-----|-------|
| `VITE_SHEET_ID` | 구글 시트 ID |
| `VITE_FORM_URL` | 구글 폼 링크 |

4. Deploy 클릭

→ 1분 후 `wohol-job.vercel.app` 주소로 라이브 🎉

---

## STEP 4 — 구글 시트 공개 설정 확인

시트 → 공유 → "링크가 있는 모든 사용자" → 뷰어

이게 안 되어 있으면 데이터를 못 읽어옴

---

## 이후 관리

- 폼에 새 제출이 들어오면 시트에 자동으로 쌓임
- 웹사이트는 페이지 열 때마다 시트에서 최신 데이터를 읽어옴
- 코드 수정 후 GitHub에 push하면 Vercel이 자동으로 재배포

---

## 로컬에서 테스트하려면

```bash
cp .env.example .env
# .env 파일 열어서 SHEET_ID, FORM_URL 채우기

npm install
npm run dev
# http://localhost:5173 에서 확인
```
