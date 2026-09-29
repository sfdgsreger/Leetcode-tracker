# 🔥 LeetCode Streak Tracker

A daily LeetCode check-in and streak tracker for you and your friends — built with **React + Vite**, **Tailwind CSS**, and **Supabase**.

---

## 📁 Project Structure

```
leetcode-tracker/
├── schema.sql                  ← Run this in Supabase SQL Editor first
├── .env.example                ← Copy to .env and fill in credentials
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx                ← Entry point (providers + router)
    ├── App.jsx                 ← Route definitions
    ├── index.css               ← Tailwind directives + base styles
    ├── lib/
    │   └── supabaseClient.js   ← Supabase client (reads from .env)
    ├── context/
    │   ├── AuthContext.jsx     ← Auth state + helpers
    │   └── ThemeContext.jsx    ← Dark/light mode toggle
    ├── components/
    │   ├── Layout.jsx          ← Shell with Navbar + footer
    │   ├── Navbar.jsx          ← Sticky nav, theme toggle, mobile menu
    │   ├── ProtectedRoute.jsx  ← Auth guard
    │   ├── CheckInModal.jsx    ← 2-step check-in flow
    │   └── StatCard.jsx        ← Reusable stat display card
    └── pages/
        ├── Login.jsx
        ├── Signup.jsx
        ├── ForgotPassword.jsx
        ├── Dashboard.jsx       ← Check-in, streak, countdown, 7-day strip
        └── Leaderboard.jsx     ← Sortable table for all users
```

---

## 🚀 Getting Started

### 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New Query**, paste the contents of `schema.sql`, and click **Run**
3. In **Project Settings → API**, copy your **Project URL** and **anon public key**

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## ✨ Features

| Feature | Details |
|---|---|
| **Auth** | Sign up, sign in, forgot password (email reset link) |
| **Daily check-in** | Logs the exact timestamp; one check-in per calendar day |
| **Question tracking** | Records each LeetCode question number per check-in |
| **Streak calculation** | Consecutive local-date check-ins; resets if a day is missed |
| **Midnight countdown** | HH:MM:SS timer; check-in button re-enables automatically at 12:00 AM |
| **7-day activity strip** | Visual mini heatmap on the Dashboard |
| **Leaderboard** | Sortable by streak, questions solved, days, or name; medal badges for top 3 |
| **Dark / Light mode** | Toggle in navbar; preference persisted to localStorage |
| **Responsive** | Works on mobile, tablet, and desktop |

---

## 🗄️ Database Schema

| Table | Key Columns |
|---|---|
| `users` | `id` (FK → auth.users), `email`, `display_name` |
| `checkins` | `id`, `user_id`, `checkin_date` (unique per user per day) |
| `questions` | `id`, `checkin_id`, `user_id`, `question_number`, `submitted_at` |

**RLS policies:** Authenticated users can read all rows (for the leaderboard). Each user can only insert/update their own rows.

A trigger automatically creates a `public.users` profile row when a new Supabase Auth user signs up.

---

## 🔧 Build for Production

```bash
npm run build
npm run preview   # test the production build locally
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, etc.).
