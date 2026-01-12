# School Management System - Setup Guide

## 🎯 Project Overview

This is a School Management System built with:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Charts**: Recharts

## 📋 Prerequisites

1. Node.js (v18 or higher)
2. A Supabase account and project

## 🚀 Setup Instructions

### 1. Supabase Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL files in this order:
   - `sql/01_schema.sql` - Creates tables, enums, indexes
   - `sql/02_rls_school_year.sql` - Sets up Row Level Security and year preferences
   - `sql/03_triggers_views.sql` - Creates triggers and dashboard views
   - `sql/04_storage_policies.sql` - Configures storage buckets and policies
   - `sql/05_seed.sql` - (Optional) Seeds initial data

### 2. Frontend Setup

1. Navigate to the app directory:
   ```bash
   cd app
   ```

2. Create a `.env` file with your Supabase credentials:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your Supabase URL and anon key:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. The dependencies are already installed. If you need to reinstall:
   ```bash
   npm install
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser to `http://localhost:5174` (or the port shown in terminal)

## 📊 Dashboard Features

### Admin Dashboard (Currently Built)

The admin dashboard displays:

- **KPI Cards**:
  - Total Enrolled Students
  - Total Teachers
  - Active Classes
  - Available Rooms

- **Academic Year Selector**: Switch between different school years

- **Year Progress Bar**: Visual indicator of academic year completion

- **Gender Ratio Chart**: Pie chart showing male/female/other distribution

- **Attendance Trend**: Line chart showing monthly attendance rates

- **Quick Actions**: Shortcuts to manage students, teachers, and view reports

## 🗂️ Project Structure

```
app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AcademicYearSelector.tsx
│   │   ├── KpiCard.tsx
│   │   ├── GenderRatioChart.tsx
│   │   └── AttendanceTrendChart.tsx
│   ├── pages/               # Page components
│   │   └── AdminDashboard.tsx
│   ├── lib/                 # Utilities
│   │   └── supabaseClient.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── .env                     # Your local config (not committed)
├── package.json
└── tailwind.config.js
```

## 🔑 Authentication Setup (Next Steps)

To add authentication:

1. In Supabase Dashboard → Authentication → Providers
2. Enable Email provider (or others as needed)
3. Add login/signup pages to your React app
4. Use Supabase Auth helpers

## 📝 Data Views

The dashboard uses these Supabase views (created in `03_triggers_views.sql`):

- `v_admin_kpis_year` - KPI metrics
- `v_admin_gender_ratio_year` - Gender distribution
- `v_admin_attendance_monthly_year` - Monthly attendance trends

All views automatically filter by the selected academic year using the `selected_academic_year_id()` function.

## 🎨 Theming

The app uses a **light green theme** as specified in the prompts:
- Primary color: Green (#22c55e)
- Background: White with green accents
- Rounded cards with soft shadows

## 🔧 Troubleshooting

**Charts not showing:**
- Ensure you have run all SQL migrations
- Check browser console for errors
- Verify your `.env` file has correct Supabase credentials

**No data appearing:**
- Run `sql/05_seed.sql` to add sample data
- Or manually add data through Supabase Table Editor

**TypeScript errors:**
- Run `npm run build` to check for build errors
- Ensure all type imports use `import type { ... }`

## 🚧 Next Steps

To complete the full system:

1. **Add Authentication** - Login/logout pages
2. **Build Other Dashboards**:
   - Teacher Dashboard
   - Student Dashboard
   - Finance Dashboard
3. **Add CRUD Pages** - Students, Teachers, Classes, etc.
4. **Implement Navigation** - Sidebar/menu system
5. **Add Forms** - Create/Edit functionality
6. **Setup Storage** - File upload for avatars, materials, etc.

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Recharts](https://recharts.org)

## 💡 Tips

- Use Supabase Realtime for live updates
- Implement proper error handling
- Add loading states for better UX
- Follow the existing prompt files for feature specs
