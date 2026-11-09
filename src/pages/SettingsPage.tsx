import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme, type AccentPalette } from '@/app/providers/ThemeProvider'
import { useCalendar } from '@/app/providers/CalendarProvider'
import { db } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { errorMessage as getErrorMessage } from '@/lib/errors'
import { DELETE_CONFIRMATION, parseBackup, summarizeBackup, type ParsedBackup } from '@/lib/calendarBackup'
import { deleteAllUserData, importBackup } from '@/services/backupService'
import {
  backupFileName,
  buildBackup,
  buildCsv,
  buildIcs,
  downloadTextFile,
  exportFileName,
  filterByRange,
  type ExportEvent,
  type ExportFormat,
  type ExportHoliday,
} from '@/lib/calendarExport'

interface SettingsPageProps {
  userId: string
}

type Theme = 'claro' | 'escuro' | 'automatico'
type Preferences = {
  firstDayOfWeek?: 'domingo' | 'segunda'
  timeFormat?: '24h' | '12h'
  calendarView?: 'mensal' | 'semanal' | 'diaria'
  accentPalette?: AccentPalette
  theme?: Theme
  [key: string]: unknown
}

type SettingsValues = {
  theme: Theme
  accentPalette: AccentPalette
  firstDayOfWeek: 'domingo' | 'segunda'
  timeFormat: '24h' | '12h'
  calendarView: 'mensal' | 'semanal' | 'diaria'
}

const settingsKey = (settings: SettingsValues) => JSON.stringify(settings)

export const SettingsPage = ({ userId }: SettingsPageProps) => {
  const { theme, setTheme, accentPalette, setAccentPalette } = useTheme()
  const {
    setWeekStartsOn,
    setTimeFormat: setCalendarTimeFormat,
    setDefaultCalendarView: applyDefaultCalendarView,
    loadEvents,
    loadHolidays,
    loadRoutineRules,
    setEvents,
    setHolidays,
  } = useCalendar()
  const [selectedTheme, setSelectedTheme] = useState<Theme>(theme)
  const [selectedPalette, setSelectedPalette] = useState<AccentPalette>(accentPalette)
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<'domingo' | 'segunda'>('segunda')
  const [timeFormat, setTimeFormat] = useState<'24h' | '12h'>('24h')
  const [calendarView, setCalendarView] = useState<'mensal' | 'semanal' | 'diaria'>('mensal')
  const [isPreferencesLoaded, setIsPreferencesLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('ics')
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [includeHolidays, setIncludeHolidays] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState('')
  const [exportError, setExportError] = useState('')
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [backupError, setBackupError] = useState('')
  const [importFile, setImportFile] = useState<ParsedBackup | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const [replaceOnImport, setReplaceOnImport] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [importError, setImportError] = useState('')
  const [replaceConfirmation, setReplaceConfirmation] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const lastSavedSettings = useRef<string | null>(null)
  const failedSettings = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    setIsPreferencesLoaded(false)
    const loadSettings = async () => {
      const { data, error } = await db
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      if (!active) return

      const preferences = (data?.preferences ?? {}) as Preferences
      const nextSettings: SettingsValues = {
        theme: preferences.theme === 'claro' || preferences.theme === 'escuro' || preferences.theme === 'automatico'
          ? preferences.theme : selectedTheme,
        accentPalette: preferences.accentPalette === 'violeta' || preferences.accentPalette === 'azul'
          || preferences.accentPalette === 'verde' || preferences.accentPalette === 'rosa' || preferences.accentPalette === 'laranja'
          ? preferences.accentPalette : selectedPalette,
        firstDayOfWeek: preferences.firstDayOfWeek === 'domingo' ? 'domingo' : 'segunda',
        timeFormat: preferences.timeFormat === '12h' ? '12h' : '24h',
        calendarView: preferences.calendarView === 'mensal' || preferences.calendarView === 'semanal'
          || preferences.calendarView === 'diaria' ? preferences.calendarView : 'mensal',
      }
      setSelectedTheme(nextSettings.theme)
      setSelectedPalette(nextSettings.accentPalette)
      setFirstDayOfWeek(nextSettings.firstDayOfWeek)
      setTimeFormat(nextSettings.timeFormat)
      setCalendarView(nextSettings.calendarView)
      lastSavedSettings.current = settingsKey(nextSettings)
      failedSettings.current = null
      setIsPreferencesLoaded(true)
    }

    void loadSettings().catch(error => {
      console.error('Unable to load preferences:', error)
      if (active) setErrorMessage('Não foi possível carregar as configurações.')
    })
    return () => { active = false }
  }, [userId])

  const currentSettings: SettingsValues = {
    theme: selectedTheme,
    accentPalette: selectedPalette,
    firstDayOfWeek,
    timeFormat,
    calendarView,
  }
  const currentSettingsKey = settingsKey(currentSettings)

  const handleSave = useCallback(async () => {
    const savingSettings: SettingsValues = {
      theme: selectedTheme,
      accentPalette: selectedPalette,
      firstDayOfWeek,
      timeFormat,
      calendarView,
    }
    const savingSettingsKey = settingsKey(savingSettings)
    setIsLoading(true)
    setErrorMessage('')
    setMessage('')

    try {
      const { data: profile, error: readError } = await db
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .maybeSingle()
      if (readError) throw readError

      const preferences = {
        ...((profile?.preferences ?? {}) as Preferences),
        ...savingSettings,
      }
      const { error } = await db
        .from('profiles')
        .upsert({ id: userId, preferences }, { onConflict: 'id' })
      if (error) throw error

      lastSavedSettings.current = savingSettingsKey
      failedSettings.current = null
      setTheme(savingSettings.theme)
      setAccentPalette(savingSettings.accentPalette)
      setWeekStartsOn(savingSettings.firstDayOfWeek === 'segunda' ? 1 : 0)
      setCalendarTimeFormat(savingSettings.timeFormat)
      applyDefaultCalendarView(savingSettings.calendarView)
      setMessage('Configurações salvas automaticamente.')
    } catch (error) {
      console.error('Unable to save preferences:', error)
      failedSettings.current = savingSettingsKey
      setErrorMessage('Não foi possível salvar as configurações.')
    } finally {
      setIsLoading(false)
    }
  }, [
    userId,
    selectedTheme,
    selectedPalette,
    firstDayOfWeek,
    timeFormat,
    calendarView,
    setTheme,
    setAccentPalette,
    setWeekStartsOn,
    setCalendarTimeFormat,
    applyDefaultCalendarView,
  ])

  useEffect(() => {
    if (!isPreferencesLoaded || isLoading || lastSavedSettings.current === currentSettingsKey) return
    if (failedSettings.current === currentSettingsKey) return
    if (failedSettings.current !== null) failedSettings.current = null

    setMessage('')
    setErrorMessage('')
    const timeout = window.setTimeout(() => { void handleSave() }, 500)
    return () => window.clearTimeout(timeout)
  }, [currentSettingsKey, handleSave, isLoading, isPreferencesLoaded])

  const handleExport = async () => {
    setExportError('')
    setExportMessage('')
    if (exportFrom && exportTo && exportFrom > exportTo) {
      setExportError('A data inicial não pode ser depois da data final.')
      return
    }

    setIsExporting(true)
    try {
      const range = { from: exportFrom || undefined, to: exportTo || undefined }
      const { data: eventRows, error: eventsError } = await db
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .order('start_at')
      if (eventsError) throw eventsError
      const events = filterByRange((eventRows ?? []) as ExportEvent[], event => new Date(event.start_at), range)

      let holidays: ExportHoliday[] = []
      if (includeHolidays) {
        let query = db
          .from('holiday_dates')
          .select('*')
          .or(`user_id.is.null,user_id.eq.${userId}`)
          .order('date')
        if (range.from) query = query.gte('date', range.from)
        if (range.to) query = query.lte('date', range.to)
        const { data: holidayRows, error: holidaysError } = await query
        if (holidaysError) throw holidaysError
        holidays = (holidayRows ?? []) as ExportHoliday[]
      }

      if (events.length === 0 && holidays.length === 0) {
        setExportError('Nenhum compromisso encontrado no período selecionado.')
        return
      }

      const isIcs = exportFormat === 'ics'
      downloadTextFile(
        isIcs ? buildIcs(events, holidays) : buildCsv(events, holidays),
        exportFileName(exportFormat),
        isIcs ? 'text/calendar;charset=utf-8' : 'text/csv;charset=utf-8',
      )
      setExportMessage(`${events.length + holidays.length} item(ns) exportado(s).`)
    } catch (error) {
      console.error('Unable to export calendar:', error)
      setExportError(getErrorMessage(error, 'Não foi possível exportar o calendário.'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleBackup = async () => {
    setBackupError('')
    setBackupMessage('')
    setIsBackingUp(true)
    try {
      const warnings: string[] = []
      // Tabelas opcionais (ex.: Rotina ainda sem migration) não bloqueiam o backup.
      const read = async (label: string, query: PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>, optional = false) => {
        const { data, error } = await query
        if (error) {
          if (optional || error.code === '42P01') {
            warnings.push(`${label}: ${error.message}`)
            return []
          }
          throw error
        }
        return (data ?? []) as unknown[]
      }

      const [profileResult, calendars, events, holidays, routineRules, routineExceptions] = await Promise.all([
        db.from('profiles').select('*').eq('id', userId).maybeSingle(),
        read('calendars', db.from('calendars').select('*').eq('user_id', userId)),
        read('events', db.from('events').select('*').eq('user_id', userId).order('start_at')),
        read('holiday_dates', db.from('holiday_dates').select('*').eq('user_id', userId).order('date')),
        read('routine_rules', db.from('routine_rules').select('*').eq('user_id', userId).order('title')),
        read('routine_exceptions', db.from('routine_exceptions').select('*').eq('user_id', userId).order('occurrence_date')),
      ])
      if (profileResult.error) throw profileResult.error

      downloadTextFile(
        buildBackup(
          { profile: profileResult.data ?? null, calendars, events, holidays, routineRules, routineExceptions },
          { warnings },
        ),
        backupFileName(),
        'application/json;charset=utf-8',
      )
      const total = calendars.length + events.length + holidays.length + routineRules.length + routineExceptions.length
      setBackupMessage(`Backup gerado com ${total} registro(s).${warnings.length ? ' Algumas tabelas foram ignoradas (veja o arquivo).' : ''}`)
    } catch (error) {
      console.error('Unable to create backup:', error)
      setBackupError(getErrorMessage(error, 'Não foi possível gerar o backup.'))
    } finally {
      setIsBackingUp(false)
    }
  }

  const refreshCalendarData = async () => {
    await Promise.all([loadEvents(), loadHolidays(), loadRoutineRules()])
  }

  const handleImportFile = async (file: File | undefined) => {
    setImportFile(null)
    setImportFileName('')
    setImportMessage('')
    setImportError('')
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      setImportError('O arquivo é grande demais para um backup do AgendaLec.')
      return
    }
    const result = parseBackup(await file.text())
    if (!result.ok) {
      setImportError(result.error)
      return
    }
    setImportFile(result.backup)
    setImportFileName(file.name)
  }

  const handleImport = async () => {
    if (!importFile) return
    if (replaceOnImport && replaceConfirmation !== DELETE_CONFIRMATION) return
    setIsImporting(true)
    setImportError('')
    setImportMessage('')
    try {
      const counts = await importBackup(userId, importFile, { replace: replaceOnImport })
      await refreshCalendarData()
      setImportMessage(
        `Importação concluída: ${counts.events} compromisso(s), ${counts.routineRules} regra(s) de rotina, ${counts.routineExceptions} ajuste(s), ${counts.calendars} calendário(s), ${counts.holidays} feriado(s). Recarregue a página para aplicar tema e preferências.`,
      )
      setImportFile(null)
      setImportFileName('')
      setReplaceConfirmation('')
    } catch (error) {
      console.error('Unable to import backup:', error)
      setImportError(getErrorMessage(error, 'Não foi possível importar o backup.'))
    } finally {
      setIsImporting(false)
    }
  }

  const handleDeleteAll = async () => {
    if (deleteConfirmation !== DELETE_CONFIRMATION) return
    setIsDeleting(true)
    setDeleteError('')
    setDeleteMessage('')
    try {
      const counts = await deleteAllUserData(userId)
      setEvents([])
      setHolidays([])
      await loadRoutineRules()
      setDeleteConfirmation('')
      setDeleteMessage(
        `Tudo apagado: ${counts.events} compromisso(s), ${counts.routineRules} regra(s) de rotina, ${counts.routineExceptions} ajuste(s), ${counts.calendars} calendário(s), ${counts.holidays} feriado(s).`,
      )
    } catch (error) {
      console.error('Unable to delete data:', error)
      setDeleteError(getErrorMessage(error, 'Não foi possível apagar os dados.'))
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmationMatches = deleteConfirmation === DELETE_CONFIRMATION

  return (
    <section className="settings-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Personalize seu espaço</p>
          <h1>Configurações</h1>
        </div>
      </header>

      {errorMessage && <p role="alert" className="settings-feedback text-sm text-red-600">{errorMessage}</p>}

      <div className="settings-layout">
        <Card className="p-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-secondary">Aparência e calendário</h2>
          <label className="block text-sm text-secondary">
            Tema
            <select className="select select-sm w-full" value={selectedTheme} onChange={event => setSelectedTheme(event.target.value as Theme)}>
              <option value="automatico">Automático</option>
              <option value="claro">Claro</option>
              <option value="escuro">Escuro</option>
            </select>
          </label>
          <label className="block text-sm text-secondary">
            Cor principal
            <select className="select select-sm w-full" value={selectedPalette} onChange={event => setSelectedPalette(event.target.value as AccentPalette)}>
              <option value="violeta">Violeta</option>
              <option value="azul">Azul</option>
              <option value="verde">Verde</option>
              <option value="rosa">Rosa</option>
              <option value="laranja">Laranja</option>
            </select>
          </label>
          <label className="block text-sm text-secondary">
            Formato de horário
            <select className="select select-sm w-full" value={timeFormat} onChange={event => setTimeFormat(event.target.value as '24h' | '12h')}>
              <option value="24h">24 horas</option>
              <option value="12h">12 horas</option>
            </select>
          </label>
          <label className="block text-sm text-secondary">
            Primeiro dia da semana
            <select className="select select-sm w-full" value={firstDayOfWeek} onChange={event => setFirstDayOfWeek(event.target.value as 'domingo' | 'segunda')}>
              <option value="domingo">Domingo</option>
              <option value="segunda">Segunda-feira</option>
            </select>
          </label>
          <label className="block text-sm text-secondary">
            Visualização padrão
            <select className="select select-sm w-full" value={calendarView} onChange={event => setCalendarView(event.target.value as 'mensal' | 'semanal' | 'diaria')}>
              <option value="mensal">Mensal</option>
              <option value="semanal">Semanal</option>
              <option value="diaria">Diária</option>
            </select>
          </label>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-secondary">Exportar calendário</h2>
          <p className="text-sm text-secondary">
            Baixe seus compromissos para usar em outro app (Google Agenda, Outlook, Apple Calendário) ou em planilhas.
          </p>
          <label className="block text-sm text-secondary">
            Formato
            <select className="select select-sm w-full" value={exportFormat} onChange={event => setExportFormat(event.target.value as ExportFormat)}>
              <option value="ics">iCalendar (.ics)</option>
              <option value="csv">Planilha (.csv)</option>
            </select>
          </label>
          <div className="settings-date-range">
            <label className="block text-sm text-secondary">
              De
              <input type="date" className="input w-full" value={exportFrom} onChange={event => setExportFrom(event.target.value)} />
            </label>
            <label className="block text-sm text-secondary">
              Até
              <input type="date" className="input w-full" value={exportTo} onChange={event => setExportTo(event.target.value)} />
            </label>
          </div>
          <p className="text-xs text-secondary">Deixe as datas em branco para exportar tudo.</p>
          <label className="settings-checkbox-label text-sm text-secondary">
            <input type="checkbox" checked={includeHolidays} onChange={event => setIncludeHolidays(event.target.checked)} />
            Incluir feriados
          </label>
          {exportError && <p role="alert" className="text-sm text-red-600">{exportError}</p>}
          {exportMessage && <p role="status" className="text-sm text-green-700">{exportMessage}</p>}
          <button type="button" onClick={() => void handleExport()} className="btn btn-secondary w-full" disabled={isExporting}>
            {isExporting ? 'Exportando...' : 'Exportar calendário'}
          </button>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-secondary">Backup completo</h2>
          <p className="text-sm text-secondary">
            Baixa tudo de uma vez em um arquivo .json: compromissos, rotina (regras e ocorrências alteradas), calendários, feriados e suas preferências.
          </p>
          {backupError && <p role="alert" className="text-sm text-red-600">{backupError}</p>}
          {backupMessage && <p role="status" className="text-sm text-green-700">{backupMessage}</p>}
          <button type="button" onClick={() => void handleBackup()} className="btn btn-secondary w-full" disabled={isBackingUp}>
            {isBackingUp ? 'Gerando backup...' : 'Exportar tudo (backup)'}
          </button>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-secondary">Importar backup</h2>
          <p className="text-sm text-secondary">
            Restaura um arquivo .json gerado pelo "Backup completo". Por padrão os dados são mesclados com os atuais; itens com o mesmo identificador são atualizados.
          </p>
          <label className="block text-sm text-secondary">
            Arquivo de backup
            <input
              type="file"
              accept=".json,application/json"
              className="input w-full"
              onChange={event => void handleImportFile(event.target.files?.[0])}
            />
          </label>
          {importFile && (
            <p className="text-sm text-secondary">
              {importFileName}: {summarizeBackup(importFile.tables)}
              {importFile.exportedAt ? ` (exportado em ${new Date(importFile.exportedAt).toLocaleString('pt-BR')})` : ''}.
            </p>
          )}
          <label className="settings-checkbox-label text-sm text-secondary">
            <input type="checkbox" checked={replaceOnImport} onChange={event => setReplaceOnImport(event.target.checked)} />
            Apagar os dados atuais antes de importar
          </label>
          {replaceOnImport && (
            <label className="block text-sm text-secondary">
              Para confirmar, digite {DELETE_CONFIRMATION}
              <input className="input w-full" value={replaceConfirmation} onChange={event => setReplaceConfirmation(event.target.value)} autoComplete="off" />
            </label>
          )}
          {importError && <p role="alert" className="text-sm text-red-600">{importError}</p>}
          {importMessage && <p role="status" className="text-sm text-green-700">{importMessage}</p>}
          <button
            type="button"
            onClick={() => void handleImport()}
            className="btn btn-secondary w-full"
            disabled={!importFile || isImporting || (replaceOnImport && replaceConfirmation !== DELETE_CONFIRMATION)}
          >
            {isImporting ? 'Importando...' : 'Importar backup'}
          </button>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-red-600">Apagar tudo</h2>
          <p className="text-sm text-secondary">
            Remove todos os seus compromissos, rotina (regras e ajustes), calendários e feriados. Suas preferências e sua conta são mantidas.
            Isso não pode ser desfeito: baixe um backup antes. Os feriados iniciais de novembro voltam sozinhos na próxima vez que o calendário for carregado.
          </p>
          <label className="block text-sm text-secondary">
            Para confirmar, digite {DELETE_CONFIRMATION}
            <input className="input w-full" value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} autoComplete="off" />
          </label>
          {deleteError && <p role="alert" className="text-sm text-red-600">{deleteError}</p>}
          {deleteMessage && <p role="status" className="text-sm text-green-700">{deleteMessage}</p>}
          <button type="button" onClick={() => void handleDeleteAll()} className="btn btn-danger w-full" disabled={!confirmationMatches || isDeleting}>
            {isDeleting ? 'Apagando...' : 'Apagar tudo'}
          </button>
        </Card>

      </div>

      {(isLoading || message) && (
        <p role="status" className="settings-save-status">
          {isLoading ? 'Salvando configurações...' : message}
        </p>
      )}
    </section>
  )
}
