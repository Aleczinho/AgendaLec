# AgendaLec - Personal Agenda Management System

## Overview
AgendaLec is a complete personal agenda management system built with modern web technologies, designed to replace Excel spreadsheets with a professional, responsive web application.

## Project Structure

```
AgendaLec/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── global.css
│   │   ├── components.css
│   │   └── responsive.css
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── CalendarDay.tsx
│   │   │   └── CalendarNav.tsx
│   │   ├── calendar/
│   │   │   ├── MonthGrid.tsx
│   │   │   ├── DayView.tsx
│   │   │   └── WeekView.tsx
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Indicators.tsx
│   │   │   └── NextEvents.tsx
│   │   ├── events/
│   │   │   ├── EventForm.tsx
│   │   │   ├── EventList.tsx
│   │   │   ├── EventCard.tsx
│   │   │   └── RecurrenceConfig.tsx
│   │   ├── navigation/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── MobileMenu.tsx
│   │   └── layouts/
│   │       ├── DesktopLayout.tsx
│   │       └── MobileLayout.tsx
│   ├── features/
│   │   ├── events/
│   │   │   ├── useEvents.ts
│   │   │   ├── useCreateEvent.ts
│   │   │   ├── useEditEvent.ts
│   │   │   └── useDeleteEvent.ts
│   │   ├── calendars/
│   │   │   ├── useCalendars.ts
│   │   │   ├── useCreateCalendar.ts
│   │   │   └── useToggleCalendar.ts
│   │   ├── recurrence/
│   │   │   ├── useRecurrence.ts
│   │   │   └── useExceptions.ts
│   │   ├── holidays/
│   │   │   ├── useHolidays.ts
│   │   │   └── useAddHoliday.ts
│   │   └── preferences/
│   │       ├── usePreferences.ts
│   │       └── useTheme.ts
│   ├── services/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── auth.ts
│   │   ├── events.ts
│   │   ├── calendars.ts
│   │   └── holidays.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCalendar.ts
│   │   ├── useRecurrence.ts
│   │   ├── useForm.ts
│   │   └── useFocus.ts
│   ├── lib/
│   │   ├── utils.ts
│   │   ├── format.ts
│   │   └── recurrence.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── calendar.ts
│   │   ├── event.ts
│   │   └── holiday.ts
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── CalendarPage.tsx
│   │   ├── AgendaPage.tsx
│   │   ├── CalendarsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── NotFoundPage.tsx
│   └── app/
│       ├── router/
│       │   └── routes.ts
│       ├── providers/
│       │   ├── ThemeProvider.tsx
│       │   ├── AuthProvider.tsx
│       │   └── CalendarProvider.tsx
│       └── layouts/
│           ├── AuthLayout.tsx
│           └── UserLayout.tsx
├── supabase/
│   ├── migrations/
│   │   ├── 20240101000001_initial_schema.sql
│   │   └── 20240101000002_add_indexes.sql
│   └── seed.sql
└── tests/
    ├── utils/
    └── components/
```

## Getting Started

1. Install dependencies: `npm install`
2. Configure Supabase: See `.env.example` and Supabase setup instructions
3. Run development server: `npm run dev`
4. Build for production: `npm run build`

## Required Dependencies

- React 18+
- React Router DOM
- React Hook Form
- Zod (for validation)
- Lucide React (icons)
- Supabase JavaScript SDK
- Vite
- Class Variance Authority (for component variants)
- clsx (for class merging)

## Setup Instructions

1. Create a Supabase project at https://supabase.com
2. Run the SQL migrations found in `supabase/migrations/`
3. Copy `.env.example` to `.env` and fill in your Supabase credentials
4. Enable Row Level Security (RLS) policies in the Supabase dashboard
5. Start development: `npm run dev`

## Features Roadmap

- [ ] Authentication with Supabase
- [ ] Calendar month navigation
- [ ] Event creation, editing, deletion
- [ ] Multiple calendar/agenda management
- [ ] Recurring events
- [ ] Holidays and special dates
- [ ] Dashboard with indicators
- [ ] Responsiveness (mobile-first)
- [ ] Export/Import (CSV, .ics)
- [ ] Theme support (light/dark/system)
- [ ] User preferences persistence