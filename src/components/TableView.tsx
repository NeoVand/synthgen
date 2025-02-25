import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Box,
  Typography,
  Checkbox,
  useTheme,
  alpha
} from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';

// Import the types from the types folder
import { QAPair, GenerationType, GenerationProgress } from '../types';

interface TableViewProps {
  qaPairs: QAPair[];
  page: number;
  rowsPerPage: number;
  availableRowsPerPage: number[];
  expandedCells: Record<string, boolean>;
  isGenerating: boolean;
  generationType: GenerationType;
  generationProgress: GenerationProgress;
  
  // Callbacks
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newRowsPerPage: number) => void;
  onToggleCellExpansion: (rowId: number, columnType: string) => void;
  onQAPairChange: (updatedQAPairs: QAPair[]) => void;
  onSelectRow: (rowId: number, selected: boolean) => void;
  onSelectAllRows: (selected: boolean) => void;
  isCellGenerating: (qa: QAPair, columnType: string) => boolean;
}

const TableView: React.FC<TableViewProps> = ({
  qaPairs,
  page,
  rowsPerPage,
  availableRowsPerPage,
  expandedCells,
  isGenerating,
  onPageChange,
  onRowsPerPageChange,
  onToggleCellExpansion,
  onQAPairChange,
  onSelectRow,
  onSelectAllRows,
  isCellGenerating
}) => {
  const theme = useTheme();

  const handlePageChange = (_: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onRowsPerPageChange(parseInt(event.target.value, 10));
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSelectAllRows(event.target.checked);
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    onSelectRow(id, checked);
  };

  const handleCellChange = (id: number, field: string, value: string) => {
    const updatedQAPairs = qaPairs.map(qa => 
      qa.id === id ? { ...qa, [field]: value } : qa
    );
    onQAPairChange(updatedQAPairs);
  };

  return (
    <TableContainer sx={{ 
      height: '100%',
      overflow: 'auto',
      '&::-webkit-scrollbar': {
        width: '8px',
        height: '8px'
      },
      '&::-webkit-scrollbar-track': {
        background: 'transparent'
      },
      '&::-webkit-scrollbar-thumb': {
        background: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.1)' 
          : 'rgba(0, 0, 0, 0.1)',
        borderRadius: '100px',
        border: '2px solid transparent',
        backgroundClip: 'padding-box',
        '&:hover': {
          background: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.2)' 
            : 'rgba(0, 0, 0, 0.2)',
        }
      }
    }}>
      <Table size="small" stickyHeader sx={{
        '& .MuiTableCell-root': {
          borderBottom: '1px solid',
          borderColor: theme.palette.divider,
          padding: '12px 16px',
          fontSize: '0.875rem',
          transition: 'all 0.2s ease',
        },
        '& .MuiTableHead-root .MuiTableCell-root': {
          fontWeight: 600,
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.9)
            : alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(8px)',
          borderBottom: '2px solid',
          borderColor: theme.palette.divider,
          fontSize: '0.8125rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          height: '40px', // Match toolbar height
          padding: '0 16px', // Adjust padding
          whiteSpace: 'nowrap',
        },
        '& .MuiTableHead-root .MuiTableCell-root:first-of-type, & .MuiTableBody-root .MuiTableCell-root:first-of-type': {
          width: '48px',
          padding: '0 0 0 14px', // Add left padding to align with sidebar button
        },
        '& .MuiTableBody-root .MuiTableRow-root': {
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.primary.main, 0.04)
              : alpha(theme.palette.primary.main, 0.04),
          },
        },
        '& .MuiCheckbox-root': {
          padding: '8px',
          borderRadius: '6px',
          color: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.common.white, 0.3)
            : alpha(theme.palette.common.black, 0.2),
          '& .MuiSvgIcon-root': {
            fontSize: '1.1rem',
            borderRadius: '2px',
          },
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
            color: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.common.white, 0.4)
              : alpha(theme.palette.common.black, 0.3),
          },
          '&.Mui-checked, &.MuiCheckbox-indeterminate': {
            color: `${theme.palette.primary.main} !important`,
          },
        },
      }}>
        <TableHead>
          <TableRow>
            <TableCell 
              padding="checkbox"
              sx={{
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.02)',
                fontWeight: 600,
              }}
            >
              <Checkbox
                checked={qaPairs.length > 0 && qaPairs.every(qa => qa.selected)}
                indeterminate={qaPairs.some(qa => qa.selected) && !qaPairs.every(qa => qa.selected)}
                onChange={handleSelectAllClick}
              />
            </TableCell>
            <TableCell 
              sx={{
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.02)',
                fontWeight: 600
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: theme.palette.mode === 'dark'
                  ? theme.palette.primary.light
                  : theme.palette.primary.dark
              }}>
                <ExtensionIcon sx={{ fontSize: '1.1rem' }} />
                Context
              </Box>
            </TableCell>
            <TableCell 
              sx={{
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.02)',
                fontWeight: 600
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: theme.palette.mode === 'dark'
                  ? theme.palette.secondary.light
                  : theme.palette.secondary.dark
              }}>
                <HelpOutlineIcon sx={{ fontSize: '1.1rem' }} />
                Question
              </Box>
            </TableCell>
            <TableCell 
              sx={{
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.02)',
                fontWeight: 600
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: theme.palette.mode === 'dark'
                  ? theme.palette.success.light
                  : theme.palette.success.dark
              }}>
                <LightbulbOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                Answer
              </Box>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {qaPairs
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((qa, rowIndex) => {
              const isAnyExpanded = ['context', 'question', 'answer'].some(
                columnType => expandedCells[`${qa.id}-${columnType}`] || isCellGenerating(qa, columnType)
              );

              return (
                <TableRow 
                  key={qa.id}
                  sx={{
                    bgcolor: theme.palette.mode === 'dark'
                      ? rowIndex % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent'
                      : rowIndex % 2 === 0 ? 'rgba(0, 0, 0, 0.03)' : 'transparent',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.05)',
                    },
                    borderBottom: '1px solid',
                    borderColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={!!qa.selected}
                      onChange={(e) => handleSelectRow(qa.id, e.target.checked)}
                    />
                  </TableCell>
                  {['context', 'question', 'answer'].map((columnType) => {
                    const isGeneratingCell = isCellGenerating(qa, columnType);
                    const isExpanded = expandedCells[`${qa.id}-${columnType}`] || isGeneratingCell;
                    const content = qa[columnType as keyof typeof qa] as string;
                    
                    return (
                      <TableCell 
                        key={columnType}
                        onClick={() => onToggleCellExpansion(qa.id, columnType)}
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          padding: '12px 16px',
                          minWidth: '200px',
                          maxWidth: '400px',
                          position: 'relative',
                          height: isAnyExpanded ? 'auto' : undefined,
                          '&:hover': {
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.04)'
                              : 'rgba(0, 0, 0, 0.02)',
                          },
                          '&:focus-within': {
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? 'rgba(0, 0, 0, 0.3)'
                              : 'rgba(255, 255, 255, 0.6)',
                          },
                        }}
                      >
                        <Box sx={{ 
                          position: 'relative',
                          maxHeight: isAnyExpanded ? (isExpanded ? 'none' : '100%') : '4.5em',
                          overflow: isExpanded ? 'visible' : 'auto',
                          transition: 'all 0.2s ease',
                          height: isAnyExpanded ? (isExpanded ? 'auto' : '100%') : '4.5em',
                          '&::-webkit-scrollbar': {
                            width: '8px',
                            height: '8px',
                            display: 'block'
                          },
                          '&::-webkit-scrollbar-track': {
                            background: 'transparent'
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.1)' 
                              : 'rgba(0, 0, 0, 0.1)',
                            borderRadius: '100px',
                            border: '2px solid transparent',
                            backgroundClip: 'padding-box',
                            '&:hover': {
                              background: theme.palette.mode === 'dark' 
                                ? 'rgba(255, 255, 255, 0.2)' 
                                : 'rgba(0, 0, 0, 0.2)',
                            }
                          },
                          overflowY: 'scroll'
                        }}>
                          <TextField
                            multiline
                            fullWidth
                            variant="standard"
                            value={content}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleCellChange(qa.id, columnType, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            InputProps={{
                              disableUnderline: true,
                              sx: {
                                alignItems: 'flex-start',
                                padding: 0,
                                fontSize: '0.875rem',
                                lineHeight: 1.5,
                                minHeight: isExpanded ? 'auto' : '4.5em',
                                backgroundColor: 'transparent',
                                '& textarea': {
                                  padding: 0,
                                }
                              }
                            }}
                            sx={{
                              width: '100%',
                              '& .MuiInputBase-root': {
                                padding: 0,
                              },
                            }}
                          />
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          {qaPairs.length === 0 && !isGenerating && (
            <TableRow>
              <TableCell colSpan={4}>
                <Typography variant="body2" color="text.secondary" align="center">
                  No chunks/Q&A yet. Upload &amp; chunk, then generate Q&A.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* Add pagination controls */}
      <TablePagination
        component="div"
        count={qaPairs.length}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={availableRowsPerPage}
        sx={{
          borderTop: 1,
          borderColor: theme.palette.divider,
          bgcolor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.6)
            : alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(8px)',
        }}
      />
    </TableContainer>
  );
};

export default TableView; 