import { Theme, createTheme } from '@mui/material/styles';

// Define theme type
export type ThemeMode = 'light' | 'dark';

// Define colors and styles for light theme
const lightTheme = {
  palette: {
    primary: {
      main: '#3b7b8b',
      light: '#8A9B8A',
      dark: '#3b7b8b',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#B67F75',
      light: '#D4A49D',
      dark: '#8F5F57',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#C75D5D',
    },
    success: {
      main: '#639A66',
    },
    background: {
      default: '#F5F2ED',
      paper: '#F5F2ED',
    },
    text: {
      primary: '#2C3333',
      secondary: '#595F5F',
    },
    divider: 'rgba(44, 51, 51, 0.08)',
  },
  component: {
    appBar: {
      backgroundColor: '#ECEAE5',
      color: 'rgba(44, 51, 51, 0.95)',
      borderRight: '1px solid rgba(44, 51, 51, 0.08)',
    },
    button: {
      contained: {
        backgroundColor: '#F5F2ED',
        color: '#2C3333',
        border: '1px solid rgba(44, 51, 51, 0.08)',
        hover: {
          backgroundColor: '#FFFFFF',
          borderColor: 'rgba(44, 51, 51, 0.12)',
        },
      },
      outlined: {
        borderColor: 'rgba(44, 51, 51, 0.15)',
        hover: {
          borderColor: 'rgba(44, 51, 51, 0.25)',
          backgroundColor: 'rgba(44, 51, 51, 0.05)',
        },
      },
      text: {
        color: 'rgba(44, 51, 51, 0.85)',
        hover: {
          backgroundColor: 'rgba(44, 51, 51, 0.05)',
        },
      },
    },
    table: {
      cell: {
        borderBottom: '1px solid rgba(44, 51, 51, 0.06)',
        hover: {
          backgroundColor: '#ECEAE5',
        },
        head: {
          backgroundColor: '#ECEAE5',
        },
      },
      row: {
        odd: {
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
        },
        hover: {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
        },
        focusWithin: {
          backgroundColor: '#ECEAE5',
        },
      },
    },
    paper: {
      backgroundColor: '#F5F2ED',
      selected: {
        backgroundColor: '#ECEAE5',
        borderColor: 'rgba(44, 51, 51, 0.25)',
      },
    },
    iconButton: {
      hover: {
        backgroundColor: 'rgba(44, 51, 51, 0.05)',
      },
    },
    checkbox: {
      color: 'rgba(44, 51, 51, 0.4)',
    },
  },
};

// Define colors and styles for dark theme
const darkTheme = {
  palette: {
    primary: {
      main: '#59bdd6',
      light: '#59bdd6',
      dark: '#384748',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#E6877C',
      light: '#F2ADA4',
      dark: '#CC6359',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#E57373',
    },
    success: {
      main: '#81C784',
    },
    background: {
      default: '#1A1C1E',
      paper: '#242628',
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.85)',
    },
    divider: 'rgba(255, 255, 255, 0.15)',
  },
  component: {
    appBar: {
      backgroundColor: '#1D1F21',
      color: 'rgba(255, 255, 255, 0.95)',
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    },
    button: {
      contained: {
        backgroundColor: '#242628',
        color: '#FFFFFF',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        hover: {
          backgroundColor: '#2A2D30',
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
      },
      outlined: {
        borderColor: 'rgba(224, 224, 224, 0.15)',
        hover: {
          borderColor: 'rgba(224, 224, 224, 0.25)',
          backgroundColor: 'rgba(224, 224, 224, 0.05)',
        },
      },
      text: {
        color: 'rgba(255, 255, 255, 0.85)',
        hover: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
      },
    },
    table: {
      cell: {
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        hover: {
          backgroundColor: '#2A2D30',
        },
        head: {
          backgroundColor: '#1D1F21',
        },
      },
      row: {
        odd: {
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        },
        hover: {
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
        },
        focusWithin: {
          backgroundColor: '#2A2D30',
        },
      },
    },
    paper: {
      backgroundColor: '#242628',
      selected: {
        backgroundColor: '#2A2D30',
        borderColor: 'rgba(255, 255, 255, 0.25)',
      },
    },
    iconButton: {
      hover: {
        backgroundColor: 'rgba(224, 224, 224, 0.05)',
      },
    },
    checkbox: {
      color: 'rgba(224, 224, 224, 0.5)',
    },
  },
};

// Function to create a theme based on mode
export const createAppTheme = (mode: ThemeMode): Theme => {
  const colors = mode === 'dark' ? darkTheme : lightTheme;
  
  return createTheme({
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
      mode,
      ...colors.palette,
    },
    components: {
      MuiAppBar: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundColor: colors.component.appBar.backgroundColor,
            color: colors.component.appBar.color,
            borderRight: colors.component.appBar.borderRight,
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
            backgroundColor: colors.component.button.contained.backgroundColor,
            color: colors.component.button.contained.color,
            border: colors.component.button.contained.border,
            '&:hover': {
              backgroundColor: colors.component.button.contained.hover.backgroundColor,
              borderColor: colors.component.button.contained.hover.borderColor,
            },
          },
          containedPrimary: {
            backgroundColor: colors.component.button.contained.backgroundColor,
            color: colors.component.button.contained.color,
            border: colors.component.button.contained.border,
            '&:hover': {
              backgroundColor: colors.component.button.contained.hover.backgroundColor,
              borderColor: colors.component.button.contained.hover.borderColor,
            },
          },
          containedSecondary: {
            backgroundColor: colors.palette.secondary.main,
            color: colors.palette.secondary.contrastText,
            '&:hover': {
              backgroundColor: colors.palette.secondary.dark,
            },
          },
          containedError: {
            backgroundColor: colors.palette.error.main,
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: mode === 'dark' ? '#D32F2F' : '#B25252',
            },
          },
          containedSuccess: {
            backgroundColor: colors.palette.success.main,
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: mode === 'dark' ? '#558269' : '#4B7B4E',
            },
          },
          outlined: {
            borderColor: colors.component.button.outlined.borderColor,
            '&:hover': {
              borderColor: colors.component.button.outlined.hover.borderColor,
              backgroundColor: colors.component.button.outlined.hover.backgroundColor,
            },
          },
          text: {
            color: colors.component.button.text.color,
            '&:hover': {
              backgroundColor: colors.component.button.text.hover.backgroundColor,
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
            borderBottom: colors.component.table.cell.borderBottom,
            padding: '6px',
            fontSize: '0.85rem',
            '&:hover': {
              backgroundColor: colors.component.table.cell.hover.backgroundColor,
            },
          },
          head: {
            backgroundColor: colors.component.table.cell.head.backgroundColor,
            fontWeight: 600,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:nth-of-type(odd)': {
              backgroundColor: colors.component.table.row.odd.backgroundColor,
            },
            '&:hover': {
              backgroundColor: colors.component.table.row.hover.backgroundColor,
            },
            '&:focus-within': {
              backgroundColor: colors.component.table.row.focusWithin.backgroundColor,
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
            backgroundColor: colors.component.paper.backgroundColor,
            border: 'none',
            borderRadius: 0,
            '&.Mui-selected, &:focus-within': {
              backgroundColor: colors.component.paper.selected.backgroundColor,
              borderColor: colors.component.paper.selected.borderColor,
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
              backgroundColor: colors.component.iconButton.hover.backgroundColor,
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
            color: colors.component.checkbox.color,
          },
        },
      },
    },
  });
}; 