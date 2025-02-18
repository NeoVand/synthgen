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
          fontSize: 12,
          htmlFontSize: 16,
          h6: {
            fontSize: '0.85rem',
            fontWeight: 500,
          },
          body1: {
            fontSize: '0.75rem',
          },
          body2: {
            fontSize: '0.7rem',
          },
          subtitle1: {
            fontSize: '0.75rem',
          },
          subtitle2: {
            fontSize: '0.7rem',
          },
        },
        shape: {
          borderRadius: 6,
        },
        palette: {
          mode: mode as 'light' | 'dark',
          primary: {
            light: mode === 'dark' ? '#8388E5' : '#A5ACFF',
            main: mode === 'dark' ? '#6b70c9' : '#A5ACFF',
            dark: mode === 'dark' ? '#565ba3' : '#8891FF',
            contrastText: mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.87)',
          },
          secondary: {
            light: mode === 'dark' ? '#B996E0' : '#D4B6FF',
            main: mode === 'dark' ? '#9C6BC9' : '#D4B6FF',
            dark: mode === 'dark' ? '#7E55A3' : '#B996E0',
            contrastText: mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.87)',
          },
          error: {
            light: mode === 'dark' ? '#D47F7F' : '#FFB1B1',
            main: mode === 'dark' ? '#b85f5f' : '#FFB1B1',
            dark: mode === 'dark' ? '#934B4B' : '#FF9494',
            contrastText: mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.87)',
          },
          success: {
            light: mode === 'dark' ? '#7FB99A' : '#B1E3C5',
            main: mode === 'dark' ? '#5f9a7a' : '#B1E3C5',
            dark: mode === 'dark' ? '#4B7B61' : '#91CBA8',
            contrastText: mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.87)',
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
                height: 32,
              },
            },
          },
          MuiToolbar: {
            styleOverrides: {
              root: {
                minHeight: 32,
                '@media (min-width: 600px)': {
                  minHeight: 32,
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.75rem',
                padding: '4px 12px',
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
                backgroundColor: mode === 'dark' ? '#4a4f8c' : '#A5ACFF',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#565ba3' : '#8891FF',
                },
              },
              containedSecondary: {
                backgroundColor: mode === 'dark' ? '#7E55A3' : '#D4B6FF',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#9C6BC9' : '#B996E0',
                },
              },
              containedError: {
                backgroundColor: mode === 'dark' ? '#8c4646' : '#FFB1B1',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#a35151' : '#FF9494',
                },
              },
              containedSuccess: {
                backgroundColor: mode === 'dark' ? '#4a725c' : '#B1E3C5',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#558269' : '#91CBA8',
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
                '& .MuiInputBase-root': {
                  fontSize: '0.75rem',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.75rem',
                },
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
                padding: '6px',
                fontSize: '0.75rem',
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
                padding: 6,
                '& .MuiSvgIcon-root': {
                  fontSize: '1.2rem',
                },
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
                },
              },
              sizeSmall: {
                padding: 4,
                '& .MuiSvgIcon-root': {
                  fontSize: '1rem',
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
