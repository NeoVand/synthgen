import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material'
import { useMemo, useState } from 'react'
import App from './App.tsx'
import { Theme } from '@mui/material/styles'

// ThemeWrapper component to handle theme switching
function ThemeWrapper() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const [mode, setMode] = useState(prefersDarkMode ? 'dark' : 'light')

  const theme: Theme = useMemo(
    () =>
      createTheme({
        typography: {
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: 13,
          htmlFontSize: 16,
          h6: {
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.0075em',
          },
          body1: {
            fontSize: '0.875rem',
          },
          body2: {
            fontSize: '0.8125rem',
          },
          subtitle1: {
            fontSize: '0.875rem',
            fontWeight: 500,
          },
          subtitle2: {
            fontSize: '0.8125rem',
            fontWeight: 500,
          },
        },
        shape: {
          borderRadius: 6,
        },
        palette: {
          mode: mode as 'light' | 'dark',
          primary: {
            main: mode === 'dark' ? '#59bdd6' : '#3b7b8b',
            light: mode === 'dark' ? '#59bdd6' : '#8A9B8A',
            dark: mode === 'dark' ? '#384748' : '#3b7b8b',
            contrastText: '#FFFFFF',
          },
          secondary: {
            main: mode === 'dark' ? '#E6877C' : '#B67F75',
            light: mode === 'dark' ? '#F2ADA4' : '#D4A49D',
            dark: mode === 'dark' ? '#CC6359' : '#8F5F57',
            contrastText: '#FFFFFF',
          },
          error: {
            main: mode === 'dark' ? '#E57373' : '#C75D5D',
          },
          success: {
            main: mode === 'dark' ? '#81C784' : '#639A66',
          },
          background: {
            default: mode === 'dark' ? '#1A1C1E' : '#F5F2ED',
            paper: mode === 'dark' ? '#242628' : '#F5F2ED',
          },
          text: {
            primary: mode === 'dark' ? '#FFFFFF' : '#2C3333',
            secondary: mode === 'dark' ? 'rgba(255, 255, 255, 0.85)' : '#595F5F',
          },
          divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(44, 51, 51, 0.08)',
        },
        components: {
          MuiAppBar: {
            defaultProps: {
              elevation: 0,
            },
            styleOverrides: {
              root: {
                backgroundColor: mode === 'dark' ? '#1D1F21' : '#ECEAE5',
                color: mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.95)'
                  : 'rgba(44, 51, 51, 0.95)',
                borderRight: `1px solid ${mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(44, 51, 51, 0.08)'}`,
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
                fontSize: '0.85rem',
                padding: '6px 16px',
                boxShadow: 'none',
                borderRadius: '4px',
                '&:hover': {
                  boxShadow: 'none',
                },
              },
              contained: {
                backgroundColor: mode === 'dark' ? '#242628' : '#F5F2ED',
                color: mode === 'dark' ? '#FFFFFF' : '#2C3333',
                border: `1px solid ${mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(44, 51, 51, 0.08)'}`,
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#2A2D30' : '#FFFFFF',
                  borderColor: mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.15)' 
                    : 'rgba(44, 51, 51, 0.12)',
                },
              },
              containedPrimary: {
                backgroundColor: mode === 'dark' ? '#242628' : '#F5F2ED',
                color: mode === 'dark' ? '#FFFFFF' : '#2C3333',
                border: `1px solid ${mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(44, 51, 51, 0.08)'}`,
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#2A2D30' : '#FFFFFF',
                  borderColor: mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.15)' 
                    : 'rgba(44, 51, 51, 0.12)',
                },
              },
              containedSecondary: {
                backgroundColor: mode === 'dark' ? '#E6877C' : '#B67F75',
                color: '#FFFFFF',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#CC6359' : '#8F5F57',
                },
              },
              containedError: {
                backgroundColor: mode === 'dark' ? '#E57373' : '#C75D5D',
                color: '#FFFFFF',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#D32F2F' : '#B25252',
                },
              },
              containedSuccess: {
                backgroundColor: mode === 'dark' ? '#81C784' : '#639A66',
                color: '#FFFFFF',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#558269' : '#4B7B4E',
                },
              },
              outlined: {
                borderColor: mode === 'dark'
                  ? 'rgba(224, 224, 224, 0.15)'
                  : 'rgba(44, 51, 51, 0.15)',
                '&:hover': {
                  borderColor: mode === 'dark'
                    ? 'rgba(224, 224, 224, 0.25)'
                    : 'rgba(44, 51, 51, 0.25)',
                  backgroundColor: mode === 'dark'
                    ? 'rgba(224, 224, 224, 0.05)'
                    : 'rgba(44, 51, 51, 0.05)',
                },
              },
              text: {
                color: mode === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(44, 51, 51, 0.85)',
                '&:hover': {
                  backgroundColor: mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(44, 51, 51, 0.05)',
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
                backgroundColor: 'transparent',
                borderBottom: `1px solid ${mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.08)' 
                  : 'rgba(44, 51, 51, 0.06)'}`,
                padding: '6px',
                fontSize: '0.85rem',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#2A2D30' : '#ECEAE5',
                },
              },
              head: {
                backgroundColor: mode === 'dark' ? '#1D1F21' : '#ECEAE5',
                fontWeight: 600,
              },
            },
          },
          MuiTableRow: {
            styleOverrides: {
              root: {
                '&:nth-of-type(odd)': {
                  backgroundColor: mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.02)' 
                    : 'rgba(0, 0, 0, 0.02)',
                },
                '&:hover': {
                  backgroundColor: mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.04)'
                    : 'rgba(0, 0, 0, 0.04)',
                },
                '&:focus-within': {
                  backgroundColor: mode === 'dark'
                    ? '#2A2D30'
                    : '#ECEAE5',
                },
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
                backgroundColor: mode === 'dark' ? '#242628' : '#F5F2ED',
                border: 'none',
                borderRadius: 0,
                '&.Mui-selected, &:focus-within': {
                  backgroundColor: mode === 'dark' ? '#2A2D30' : '#ECEAE5',
                  borderColor: mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(44, 51, 51, 0.25)',
                },
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
                  backgroundColor: mode === 'dark'
                    ? 'rgba(224, 224, 224, 0.05)'
                    : 'rgba(44, 51, 51, 0.05)',
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
                color: mode === 'dark'
                  ? 'rgba(224, 224, 224, 0.5)'
                  : 'rgba(44, 51, 51, 0.4)',
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
