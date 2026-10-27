import { createRoute, parentRoute } from '@react-router/dev/routes'

export const routes = [
  parentRoute('/', [
    { path: '/', component: 'LoginPage', label: 'Login' },
    { path: '/calendar', component: 'CalendarPage', label: 'Calendário' },
    { path: '/agenda', component: 'AgendaPage', label: 'Agenda' },
    { path: '/calendars', component: 'CalendarsPage', label: 'Agendas' },
    { path: '/settings', component: 'SettingsPage', label: 'Configurações' },
  ]),
]