import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import App from './App.tsx'
import { ThemeMode, createAppTheme } from './config/theme.ts'

// ThemeWrapper component to handle theme switching
function ThemeWrapper() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const [mode, setMode] = useState<ThemeMode>(prefersDarkMode ? 'dark' : 'light')

  const theme = useMemo(() => createAppTheme(mode), [mode])

  const handleThemeChange = useCallback(() => {
    setMode((prevMode) => prevMode === 'light' ? 'dark' : 'light')
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App onThemeChange={handleThemeChange} />
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeWrapper />
  </StrictMode>,
)
