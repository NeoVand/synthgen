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
            light: mode === 'dark' ? '#8388E5' : '#A5ACFF',
            main: mode === 'dark' ? '#6b70c9' : '#8891FF',
            dark: mode === 'dark' ? '#565ba3' : '#6B74E3',
            contrastText: '#fff',
          },
          secondary: {
            light: mode === 'dark' ? '#B996E0' : '#D4B6FF',
            main: mode === 'dark' ? '#9C6BC9' : '#B996E0',
            dark: mode === 'dark' ? '#7E55A3' : '#9C6BC9',
            contrastText: '#fff',
          },
          error: {
            light: mode === 'dark' ? '#D47F7F' : '#FFB1B1',
            main: mode === 'dark' ? '#b85f5f' : '#FF9494',
            dark: mode === 'dark' ? '#934B4B' : '#D67373',
          },
          success: {
            light: mode === 'dark' ? '#7FB99A' : '#B1E3C5',
            main: mode === 'dark' ? '#5f9a7a' : '#91CBA8',
            dark: mode === 'dark' ? '#4B7B61' : '#66A583',
          },
          background: {
            default: mode === 'dark' ? '#0F1117' : '#F0F4F8',
            paper: mode === 'dark' ? '#1A1D27' : '#FFFFFF',
          },
          text: {
            primary: mode === 'dark' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
            secondary: mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(15, 23, 42, 0.55)',
            disabled: mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.35)',
          },
          action: {
            active: mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(15, 23, 42, 0.6)',
            hover: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.03)',
            selected: mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.06)',
            disabled: mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(15, 23, 42, 0.24)',
            disabledBackground: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.08)',
            focus: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.08)',
          },
          divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.06)',
        },
        components: {
          MuiAppBar: {
            defaultProps: {
              elevation: 0,
            },
            styleOverrides: {
              root: {
                backgroundColor: 'transparent',
                color: mode === 'dark' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
                borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)'}`,
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
                backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.03)',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.06)',
                  boxShadow: 'none',
                },
              },
              containedPrimary: {
                backgroundColor: mode === 'dark' ? '#4a4f8c' : '#8891FF',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#565ba3' : '#6B74E3',
                },
              },
              containedError: {
                backgroundColor: mode === 'dark' ? '#8c4646' : '#FF9494',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#a35151' : '#D67373',
                },
              },
              containedSuccess: {
                backgroundColor: mode === 'dark' ? '#4a725c' : '#91CBA8',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#558269' : '#66A583',
                },
              },
              outlined: {
                borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.12)',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.03)',
                  borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.2)',
                },
              },
              text: {
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.03)',
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
                border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)'}`,
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
                },
              },
            },
          },
          MuiCheckbox: {
            styleOverrides: {
              root: {
                color: mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.4)',
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
