import { Outlet, Navigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const UserLayout = () => {
  // Check if user is authenticated
  const isAuthenticated = true // This would come from AuthContext

  if (!isAuthenticated) {
    return <Navigate to="/" replace={true} />
  }

  return (
    <div className="min-h-screen bg-bg dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar min-h-screen border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-font-semibold">AgendaLec</h2>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <a
            href="/calendar"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L5.05 4.05zm1.4 8.24l2.16 2.16a1 1 0 01-1.414 1.414L6.5 10.91l-1.98 1.98a1 1 0 01-1.414-1.414.75.75 0 000 1.06l1.83 1.83a1 1 0 01-1.06 1.414l-2.16 2.16a1 1 0 01-1.414-1.414.75.75 0 000-1.06l1.98-1.98a1 1 0 011.414 0l2.16-2.16a.75.75 0 001.06-1.414z" clipRule="evenodd" />
            </svg>
            Calendário
          </a>

          <a
            href="/agenda"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L5.05 4.05zm1.4 8.24l2.16 2.16a1 1 0 01-1.414 1.414L6.5 10.91l-1.98 1.98a1 1 0 01-1.414-1.414.75.75 0 000 1.06l1.83 1.83a1 1 0 01-1.06 1.414l-2.16 2.16a1 1 0 01-1.414-1.414.75.75 0 000-1.06l1.98-1.98a1 1 0 011.414 0l2.16-2.16a.75.75 0 001.06-1.414z" clipRule="evenodd" />
            </svg>
            Agenda
          </a>

          <a
            href="/calendars"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L5.05 4.05zm1.4 8.24l2.16 2.16a1 1 0 01-1.414 1.414L6.5 10.91l-1.98 1.98a1 1 0 01-1.414-1.414.75.75 0 000 1.06l1.83 1.83a1 1 0 01-1.06 1.414l-2.16 2.16a1 1 0 01-1.414-1.414.75.75 0 000-1.06l1.98-1.98a1 1 0 011.414 0l2.16-2.16a.75.75 0 001.06-1.414z" clipRule="evenodd" />
            </svg>
            Agendas
          </a>

          <a
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L5.05 4.05zm1.4 8.24l2.16 2.16a1 1 0 01-1.414 1.414L6.5 10.91l-1.98 1.98a1 1 0 01-1.414-1.414.75.75 0 000 1.06l1.83 1.83a1 1 0 01-1.06 1.414l-2.16 2.16a1 1 0 01-1.414-1.414.75.75 0 000-1.06l1.98-1.98a1 1 0 011.414 0l2.16-2.16a.75.75 0 001.06-1.414z" clipRule="evenodd" />
            </svg>
            Configurações
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default UserLayout