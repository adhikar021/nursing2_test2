
const cfg = window.NQ_CONFIG;
const api = (p) => cfg.API_BASE + p;

export function upiUrl({pa, pn, am, cu='INR'}){
  return `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${encodeURIComponent(am)}&cu=${encodeURIComponent(cu)}`;
}

export function formatTime(s){
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const r = (s%60).toString().padStart(2,'0');
  return `${m}:${r}`;
}

export async function fetchQuestions(dateStr){
  const res = await fetch(api(`/api/questions?date=${dateStr}`));
  return res.json();
}

export async function submitAnswers({username,date,answers,timeTakenSeconds}){
  const res = await fetch(api('/api/submit'),{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username,date,answers,timeTakenSeconds})
  });
  return res.json();
}

export async function leaderboard(dateStr){
  const res = await fetch(api(`/api/leaderboard?date=${dateStr}`));
  return res.json();
}

export async function uploadCsv(file){
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(api('/api/admin/upload'), { method:'POST', body:fd });
  return res.json();
}
