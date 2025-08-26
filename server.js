
import express from 'express';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import cors from 'cors';
import multer from 'multer';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

const dataDir = path.join(__dirname, 'data');
const csvFile = path.join(dataDir, 'questions.csv');
const submissionsFile = path.join(dataDir, 'submissions.json');

// Root landing page
app.get('/', (req, res) => {
  res.send('<h1>NursingQuiz API is running ✅</h1><p>Try <a href="/api/questions">/api/questions</a> for today\'s quiz.</p>');
});

// Helper: read CSV and filter by date
function readQuestionsByDate(dateStr) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (row) => {
        if ((row.date || '').trim() === dateStr) {
          results.push({
            que: row.que,
            a: row.a, b: row.b, c: row.c, d: row.d,
            ans: row.ans
          });
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// GET /api/questions?date=YYYY-MM-DD
app.get('/api/questions', async (req, res) => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  const date = req.query.date || localDate;
  try {
    const qs = await readQuestionsByDate(date);
    res.json({ date, count: qs.length, questions: qs.map(q => ({ ...q, ans: undefined })) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/submit { username, answers:[A..], date, timeTakenSeconds }
app.post('/api/submit', async (req, res) => {
  const { username='Guest', answers=[], date, timeTakenSeconds=0 } = req.body || {};
  if (!date) return res.status(400).json({ error: 'date is required' });
  try {
    const qs = await readQuestionsByDate(date);
    if (qs.length === 0) return res.status(400).json({ error: 'No questions for date' });

    let score = 0;
    const details = qs.map((q, i) => {
      const userAns = (answers[i] || '').toUpperCase();
      const correct = userAns === (q.ans || '').toUpperCase();
      if (correct) score++;
      return { ...q, userAns, correct };
    });

    // Save submission
    let submissions = [];
    try { submissions = JSON.parse(fs.readFileSync(submissionsFile, 'utf-8')); } catch { submissions = []; }
    submissions.push({ username, date, score, timeTakenSeconds, submittedAt: new Date().toISOString() });
    fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));

    res.json({ score, total: qs.length, details });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/leaderboard?date=YYYY-MM-DD
app.get('/api/leaderboard', (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ error: 'date is required' });
  let submissions = [];
  try { submissions = JSON.parse(fs.readFileSync(submissionsFile, 'utf-8')); } catch { submissions = []; }
  const todays = submissions.filter(s => s.date === date);
  todays.sort((a,b) => b.score - a.score || a.timeTakenSeconds - b.timeTakenSeconds);
  res.json({ date, top: todays.slice(0,10) });
});

// Admin CSV upload to replace questions.csv
const upload = multer({ dest: path.join(__dirname, 'uploads') });
app.post('/api/admin/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });
  const tempPath = req.file.path;
  fs.rename(tempPath, csvFile, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Questions CSV uploaded successfully.' });
  });
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
