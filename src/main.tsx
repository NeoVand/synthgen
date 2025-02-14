import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material'
import { useMemo, useState } from 'react'
import App from './App.tsx'

// ThemeWrapper component to handle theme switching
function ThemeWrapper() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const [mode, setMode] = useState(prefersDarkMode ? 'dark' : 'light')

  const theme = useMemo(
    () =>
      createTheme({
        typography: {
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          h6: {
            fontSize: '1rem',
            fontWeight: 500,
          },
          body1: {
            fontSize: '0.875rem',
          },
          body2: {
            fontSize: '0.8125rem',
          },
        },
        shape: {
          borderRadius: 6,
        },
        palette: {
          mode: mode as 'light' | 'dark',
          primary: {
            main: mode === 'dark' ? '#6b70c9' : '#5a64d9',
            dark: mode === 'dark' ? '#565ba3' : '#4850ad',
          },
          error: {
            main: mode === 'dark' ? '#b85f5f' : '#d46c6c',
          },
          success: {
            main: mode === 'dark' ? '#5f9a7a' : '#66a583',
          },
          background: {
            default: mode === 'dark' ? '#0a0a0a' : '#f8f9fa',
            paper: mode === 'dark' ? '#141414' : '#ffffff',
          },
          text: {
            primary: mode === 'dark' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.87)',
            secondary: mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
          },
          action: {
            hover: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          },
        },
        components: {
          MuiAppBar: {
            defaultProps: {
              elevation: 0,
            },
            styleOverrides: {
              root: {
                backgroundColor: 'transparent',
                color: mode === 'dark' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.87)',
                borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                height: 48,
              },
            },
          },
          MuiToolbar: {
            styleOverrides: {
              root: {
                minHeight: 48,
                '@media (min-width: 600px)': {
                  minHeight: 48,
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.8125rem',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: 'none',
                },
              },
              contained: {
                backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                  boxShadow: 'none',
                },
              },
              containedPrimary: {
                backgroundColor: mode === 'dark' ? '#4a4f8c' : '#5a64d9',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#565ba3' : '#4850ad',
                },
              },
              containedError: {
                backgroundColor: mode === 'dark' ? '#8c4646' : '#c25555',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#a35151' : '#ad4848',
                },
              },
              containedSuccess: {
                backgroundColor: mode === 'dark' ? '#4a725c' : '#5a8c6e',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#558269' : '#66a583',
                },
              },
            },
          },
          MuiTextField: {
            defaultProps: {
              size: 'small',
            },
            styleOverrides: {
              root: {
                '& .MuiInput-underline:before': {
                  borderBottom: 'none',
                },
                '& .MuiInput-underline:hover:before': {
                  borderBottom: 'none',
                },
                '& .MuiInput-underline:after': {
                  borderBottom: 'none',
                },
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderBottom: 'none',
                padding: '8px',
                fontSize: '0.8125rem',
              },
            },
          },
          MuiPaper: {
            defaultProps: {
              elevation: 0,
            },
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              },
            },
          },
        },
      }),
    [mode]
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App onThemeChange={() => setMode(mode === 'light' ? 'dark' : 'light')} />
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeWrapper />
  </StrictMode>,
)
