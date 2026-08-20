import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  ListItemText,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { tokens } from '../theme';

/**
 * Generic spreadsheet-style renderer for any section. Driven entirely by
 * `columns` (pass config.tableColumns from sectionFields.js) — no
 * per-section code needed. Sits alongside DashboardSection.jsx as a second
 * reusable display option.
 *
 * Desktop: CSS Grid, real aligned columns, no <Table> tag.
 * Mobile: same grid, but only "priority" (first N visible) columns shown
 * by default to avoid horizontal scroll; gear menu lets user pick which
 * columns show, on either breakpoint. If the user selects more columns
 * than fit, the grid scrolls horizontally rather than breaking layout.
 *
 * Column shape: { name, label, format?: (row) => string }
 */
const MOBILE_DEFAULT_VISIBLE = 3;

const SpreadsheetSection = ({
  columns,
  items = [],
  onRowClick,
  onEditRequest,
  onDeleteRequest,
  emptyMessage = 'Nothing here yet',
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [visible, setVisible] = useState(() => {
    const initial = {};
    columns.forEach((col, i) => {
      initial[col.name] = isMobile ? i < MOBILE_DEFAULT_VISIBLE : true;
    });
    return initial;
  });
  const [anchorEl, setAnchorEl] = useState(null);

  const visibleColumns = useMemo(
    () => columns.filter((col) => visible[col.name]),
    [columns, visible]
  );

  const toggleColumn = (name) => {
    setVisible((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const getCellValue = (col, row) => {
    if (col.format) return col.format(row);
    const value = row[col.name];
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  };

  const hasActions = Boolean(onEditRequest || onDeleteRequest);
  const gridTemplateColumns = `${visibleColumns
    .map((col) => (col.wrap ? 'minmax(160px, 2fr)' : 'minmax(90px, 1fr)'))
    .join(' ')}${hasActions ? ' 70px' : ''}`;

  return (
    <Box>
      {/* TOOLBAR */}
      <Box display="flex" justifyContent="flex-end" mb="8px">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ color: colors.grey[300], '&:hover': { color: colors.grey[100] } }}
          aria-label="Choose columns"
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: {
              bgcolor: colors.primary[400],
              color: colors.grey[100],
              border: `1px solid ${colors.primary[500]}`,
            },
          }}
        >
          {columns.map((col) => (
            <MenuItem key={col.name} onClick={() => toggleColumn(col.name)} dense>
              <Checkbox
                checked={Boolean(visible[col.name])}
                size="small"
                sx={{ color: colors.grey[300] }}
              />
              <ListItemText primary={col.label} />
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {items.length === 0 ? (
        <Box py={4} textAlign="center">
          <Typography color={colors.grey[300]} fontStyle="italic">
            {emptyMessage}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            overflowX: 'auto',
            border: `1px solid ${colors.primary[500]}`,
            borderRadius: '10px',
          }}
        >
          <Box sx={{ minWidth: 'fit-content' }}>
            {/* HEADER ROW */}
            <Box
              display="grid"
              sx={{
                gridTemplateColumns,
                backgroundColor: colors.blueAccent[700],
                borderTopLeftRadius: '10px',
                borderTopRightRadius: '10px',
              }}
            >
              {visibleColumns.map((col) => (
                <Box key={col.name} px="12px" py="10px">
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={colors.grey[100]}
                    noWrap
                  >
                    {col.label}
                  </Typography>
                </Box>
              ))}
              {hasActions && <Box px="12px" py="10px" />}
            </Box>

            {/* DATA ROWS */}
            {items.map((item, i) => (
              <Box key={item.id ?? i}>
                <Box
                  display="grid"
                  onClick={() => onRowClick && onRowClick(item)}
                  sx={{
                    gridTemplateColumns,
                    backgroundColor: colors.primary[400],
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:hover': onRowClick ? { backgroundColor: colors.primary[500] } : undefined,
                  }}
                >
                  {visibleColumns.map((col) => (
                    <Box key={col.name} px="12px" py="10px" minWidth={0}>
                      <Typography
                        variant="body2"
                        color={colors.grey[200]}
                        noWrap={!col.wrap}
                        title={getCellValue(col, item.raw || item)}
                        sx={col.wrap ? { wordBreak: 'break-word', whiteSpace: 'normal' } : undefined}
                      >
                        {getCellValue(col, item.raw || item)}
                      </Typography>
                    </Box>
                  ))}
                  {hasActions && (
                    <Box
                      px="8px"
                      py="6px"
                      display="flex"
                      alignItems="start"
                      justifyContent="flex-end"
                      gap="2px"
                    >
                      {onEditRequest && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditRequest(item);
                          }}
                        >
                          <EditIcon fontSize="small" sx={{ color: colors.blueAccent[400] }} />
                        </IconButton>
                      )}
                      {onDeleteRequest && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRequest(item);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" sx={{ color: colors.redAccent[400] }} />
                        </IconButton>
                      )}
                    </Box>
                  )}
                </Box>
                {i < items.length - 1 && <Divider sx={{ borderColor: colors.primary[500] }} />}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SpreadsheetSection;