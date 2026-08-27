import { useRef, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Link } from "react-router-dom";
import { tokens } from "../theme";
import Collapse from '@mui/material/Collapse';
import sectionFieldsConfig from '../config/sectionFields'

const SWIPE_THRESHOLD = 90;
const MOVE_CANCEL_PX = 10;
const isTouchDevice =
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

/**
 * One row's interaction shell with a 3-dot context menu.
 */
const SectionItemRow = ({
  item,
  colors,
  isLast,
  onViewRequest,
  onEditRequest,
  onCloneRequest,
  onDeleteRequest,
  statusOptions,
  onStatusChange,
  children,
}) => {
  const [dragX, setDragX] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  // Right-swipe status panel: independent of dragX/delete logic below.
  // Stays open until a status is picked or the row is tapped again.
  const [statusOpen, setStatusOpen] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const touchMoved = useRef(false);

  const availableStatuses = (statusOptions || []).filter(
    (opt) => opt.value !== item.status
  );

  const handlePickStatus = (value) => (e) => {
    e.stopPropagation();
    setStatusOpen(false);
    if (onStatusChange) onStatusChange(item, value);
  };

  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = (e) => {
    if (e) e.stopPropagation();
    setAnchorEl(null);
  };

  const handleAction = (actionFn) => (e) => {
    e.stopPropagation();
    setAnchorEl(null);
    if (actionFn) actionFn(item);
  };

  const startY = useRef(0);

  const onTouchStart = (e) => {
    dragging.current = true;
    touchMoved.current = false;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e) => {
    if (!dragging.current) return;
      const x = e.touches[0].clientX - startX.current;
      const y = e.touches[0].clientY - startY.current;
    // Vertical scroll intent: bail out of the horizontal drag entirely so
    // the row snaps back and the page scrolls normally.
    if (Math.abs(y) > Math.abs(x) && Math.abs(y) > MOVE_CANCEL_PX) {
      dragging.current = false;
      touchMoved.current = false;
      setDragX(0);
      return;
    }

    if (Math.abs(x) > MOVE_CANCEL_PX) touchMoved.current = true;
    setDragX(x);
  };

  const onTouchEnd = () => {
    
    if (!dragging.current) return;
    dragging.current = false;
    try {
      if (dragX < -SWIPE_THRESHOLD  && onDeleteRequest ) {
        onDeleteRequest(item);
      } else if (dragX > 40 && availableStatuses.length > 0) {
        setStatusOpen(true);
      }
      // Single-tap onViewRequest(item) removed completely to prevent accidental opens!
      /*     else if (!touchMoved.current && !menuOpen) {
        onViewRequest(item);
      } */
    } finally {
      setDragX(0);
    }
  };

  const onTouchCancel = () => {
    dragging.current = false;
    touchMoved.current = false;
    setDragX(0);
  };

  const touchHandlers = isTouchDevice
    ? { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel }
    : {};

  const desktopHandlers = isTouchDevice
    ? {}
    : {
        onClick: () => onViewRequest(item),
      };

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '6px',
        borderBottom: isLast ? 'none' : `1px solid ${colors.primary[500]}33`, //Low-Opacity 1px Border (Most consistent across all displays) // 33 adds ~20% opacity in hex
      }}
    >
      {isTouchDevice && dragX < 0 && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            pr: 3,
            backgroundColor: colors.redAccent[500],
            opacity: Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1),
          }}
        >
          <CloseIcon sx={{ color: '#fff' }} />
        </Box>
      )}

      {statusOpen && availableStatuses.length > 0 && (
        <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '190px', display: 'flex', zIndex: 1 }}>
          {availableStatuses.map((opt) => {
            const StatusIcon = opt.icon;
            const c = colors[opt.colorKey] || colors.grey;
            return (
              <Box
                key={opt.value}
                onClick={handlePickStatus(opt.value)}
                aria-label={opt.label}
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${c[500]}33`,
                  cursor: 'pointer',
                }}
              >
                <StatusIcon fontSize="small" sx={{ color: c[500] }} />
              </Box>
            );
          })}
        </Box>
      )}

      <Box
        {...touchHandlers}
        {...desktopHandlers}
        onClick={(e) => {
          if (statusOpen) {
            e.stopPropagation();
            setStatusOpen(false);
            return;
          }
          if (desktopHandlers.onClick) desktopHandlers.onClick(e);
        }}
        sx={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          py: '10px',
          px: isTouchDevice ? 0 : '2px',
          backgroundColor: colors.primary[400],
          transform: isTouchDevice ? `translateX(${statusOpen ? 190 : dragX}px)` : 'none',
          transition: dragging.current ? 'none' : 'transform 0.2s ease',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          flex={1}
          gap="10px"
          minWidth={0}
          sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        >
          {children}
        </Box>

        <IconButton
          size="small"
          aria-label="More options"
          onClick={handleMenuClick}
          sx={{
            color: colors.grey[300],
            '&:hover': { color: colors.grey[100] },
            flexShrink: 0,
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
          PaperProps={{
            sx: {
              bgcolor: colors.primary[400],
              color: colors.grey[100],
              border: `1px solid ${colors.primary[500]}`,
            },
          }}
        >
          <MenuItem onClick={handleAction(onViewRequest)}>
            <ListItemIcon sx={{ color: colors.grey[100] }}>
              <VisibilityIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View</ListItemText>
          </MenuItem>

          {onEditRequest && (
            <MenuItem onClick={handleAction(onEditRequest)}>
              <ListItemIcon sx={{ color: colors.grey[100] }}>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
          )}

          {onCloneRequest && (
            <MenuItem onClick={handleAction(onCloneRequest)}>
              <ListItemIcon sx={{ color: colors.greenAccent[400] }}>
                <ContentCopyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText sx={{ color: colors.greenAccent[400] }}>Clone</ListItemText>
            </MenuItem>
          )}

          {availableStatuses.length > 0 &&
            availableStatuses.map((opt) => {
              const StatusIcon = opt.icon;
              const c = colors[opt.colorKey] || colors.grey;
              return (
                <MenuItem key={opt.value} onClick={handleAction(() => onStatusChange && onStatusChange(item, opt.value))}>
                  <ListItemIcon sx={{ color: c[500] }}>
                    <StatusIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{opt.label}</ListItemText>
                </MenuItem>
              );
            })}

          {onDeleteRequest && (
            <MenuItem onClick={handleAction(onDeleteRequest)} sx={{ color: colors.redAccent[400] }}>
              <ListItemIcon sx={{ color: colors.redAccent[400] }}>
                <DeleteOutlineIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </Box>
    </Box>
  );
};

const DashboardSection = ({
  title,
  icon,
  items = [],
  emptyMessage = 'Nothing here yet',
  viewAllLink,
  isCollapsed = false,
  renderItem,
  onEditRequest,
  onCloneRequest,
  onDeleteRequest,
  statusOptions,
  onStatusChange,
  sectionKey,
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleViewRequest = (item) => {
    setSelectedItem(item);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  const handleEditFromDetails = () => {
    if (!selectedItem || !onEditRequest) return;
    const item = selectedItem;
    setSelectedItem(null);
    onEditRequest(item);
  };

  const detailFields = selectedItem?.raw
    ? Object.entries(selectedItem.raw).filter(
        ([, value]) => value !== null && value !== undefined && value !== ''
      )
    : [];
  
  const fontWeightBySection = {
    events: 600,
    appointments: 600,
    routine: 600,
    todo_list: 400,
  }; 

  const getUrgencyColor = (item) => {
    if (item.dateLabelColor) return item.dateLabelColor; // already set upstream

    if (!item.meta) return colors.greenAccent[500]; // fallback, no date info

    if (item.meta === 'Today') return '#4caf50';
    if (item.meta === 'Tomorrow') return '#42a5f5';
    if (item.meta === 'Past') return '#ef5350';

    // "N days to go" — extract the number and scale urgency
    const match = item.meta.match(/^(\d+) days? to go$/);
    if (match) {
      const days = parseInt(match[1], 10);
      if (days <= 3) return '#ff9800';   // orange — coming up soon
      if (days <= 7) return '#42a5f5';   // blue — this week
      return colors.grey[300];           // default — further out
    }

    return colors.greenAccent[500];
  };

  const secondaryFontWeightBySection = {
    events: 500,
    appointments: 400,
    routine: 400,
    todo_list: 400,
  };

  const secondaryColorBySection = {
    events: colors.grey[300],
    appointments: colors.grey[300],
    routine: colors.grey[400],
    todo_list: colors.grey[400],
  };
  
  const defaultRenderItem = (item, i) => {
    console.log('sectionKey:', sectionKey, 'weight:', fontWeightBySection[sectionKey]);
    const row = (
      <>
        <Box
          minWidth={0}
          sx={{
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}
        >
          <Typography
            color={colors.grey[100]}
            //fontWeight="600"
            fontWeight={fontWeightBySection[sectionKey] || 600}
            title={item.primary}
            sx={{
              fontSize: { xs: '1.25rem', sm: '0.875rem' },
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
          >
            {item.primary}
          </Typography>
          {item.secondary && (
            <Typography
              variant="body2"
              color={item.dateLabelColor || secondaryColorBySection[sectionKey] || colors.grey[300]}
              sx={{
                fontSize: { xs: '0.9rem', sm: '0.75rem' },
                fontWeight: secondaryFontWeightBySection[sectionKey] || 400,
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
              }}
            >
              {item.secondary}
            </Typography>
          )}
        </Box>
        {item.meta && (
          <Typography
            variant="body2"
            // color={item.dateLabelColor || colors.greenAccent[500]}
            color={getUrgencyColor(item)}
            whiteSpace="nowrap"
            sx={{ flexShrink: 0, fontSize: { xs: '0.9rem', sm: '0.75rem' } }}
          >
            {item.meta}
          </Typography>
        )}
      </>
    );

    return (
      <SectionItemRow
        key={item.id ?? i}
        item={item}
        colors={colors}
        isLast={i === items.length - 1}
        onViewRequest={handleViewRequest}
        onEditRequest={onEditRequest}
        onCloneRequest={onCloneRequest}
        onDeleteRequest={onDeleteRequest}
        statusOptions={statusOptions}
        onStatusChange={onStatusChange}
      >
        {row}
      </SectionItemRow>
    );
  };

  return (
    <>
      <Box
        backgroundColor={colors.primary[400]}
        borderRadius="16px"
        p="20px"
        display="flex"
        flexDirection="column"
        justifyContent="flex-start"
        height="100%"
        sx={{
          overflow: 'hidden',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* HEADER */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={isCollapsed ? 0 : '10px'}
          pb={isCollapsed ? 0 : '10px'}
          borderBottom={isCollapsed ? 'none' : `2px solid ${colors.primary[500]}`}
          sx={{ transition: 'margin 0.25s ease, padding 0.25s ease' }}
        >
          <Box display="flex" alignItems="center" gap="10px" minWidth={0}>
            <Box
              color={colors.greenAccent[500]}
              display="flex"
              alignItems="center"
              sx={{ flexShrink: 0 }}
            >
              {icon}
            </Box>
            <Typography
              variant="h5"
              fontWeight="600"
              color={colors.grey[100]}
              sx={{
                wordBreak: 'break-word',
              }}
            >
              {title}
            </Typography>
          </Box>
        </Box>

        {/* SMOOTH COLLAPSIBLE BODY AREA */}
        {/* BODY */}
        <Collapse in={!isCollapsed} timeout="auto" unmountOnExit={false}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* ITEM LIST */}
          <Box flex={1} overflow="auto">
            {items.length === 0 ? (
              <Box
                height="100%"
                minHeight="80px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Typography color={colors.grey[300]} fontStyle="italic">
                  {emptyMessage}
                </Typography>
              </Box>
            ) : (
              items.map((item, i) =>
                renderItem ? renderItem(item, i) : defaultRenderItem(item, i)
              )
            )}
          </Box>

        {/* FOOTER - VIEW ALL LINK - Pinned to absolute bottom edge */}
        {viewAllLink && (
          <Box
            display="flex"
            justifyContent="flex-end"
            mt="10px"
            pt="10px"
            borderTop={`1px solid ${colors.primary[500]}`}
          >
            <Typography
              component={Link}
              to={viewAllLink}
              variant="body2"
              sx={{
                color: colors.greenAccent[400],
                textDecoration: "none",
                whiteSpace: "nowrap",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              View all
            </Typography>
          </Box>
        )}
       </Box>
      </Collapse>
      </Box>

      {/* VIEW DETAILS DIALOG (Color matched to theme) */}
      <Dialog
        open={Boolean(selectedItem)}
        onClose={handleCloseDetails}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: colors.primary[400],
            backgroundImage: "none",
            borderRadius: '16px',
            color: colors.grey[100],
          },
        }}
      >
        <DialogTitle sx={{ pr: 6, color: colors.grey[100], fontWeight: 'bold' }}>
          {selectedItem?.primary || "Details"}
          <IconButton
            aria-label="Close"
            onClick={handleCloseDetails}
            sx={{ position: "absolute", right: 8, top: 8, color: colors.grey[300] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: colors.primary[500] }}>
          {(selectedItem?.secondary || selectedItem?.meta) && (
            <Box mb={detailFields.length ? 2 : 0}>
              {selectedItem?.secondary && (
                <Typography color={colors.grey[300]} mb={0.5}>
                  {selectedItem.secondary}
                </Typography>
              )}
              {selectedItem?.meta && (
                <Typography color={colors.greenAccent[500]} fontWeight="600">
                  {selectedItem.meta}
                </Typography>
              )}
            </Box>
          )}

          {detailFields.length > 0 && (
            <Box>
              {detailFields.map(([key, value], index) => (
                <Box key={key}>
                  {index > 0 && <Divider sx={{ borderColor: colors.primary[500] }} />}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    gap={2}
                    py={1.25}
                  >
                    <Typography color={colors.grey[300]} sx={{ textTransform: "capitalize" }}>
                      {key.replace(/_/g, " ")}
                    </Typography>
                    <Typography
                      color={colors.grey[100]}
                      textAlign="right"
                      /* sx={{ wordBreak: "break-word" }} */
                      sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    >
                      {String(value)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderColor: colors.primary[500] }}>
          <Button onClick={handleCloseDetails} sx={{ color: colors.grey[300] }}>
            Close
          </Button>
          {onEditRequest && (
            <Button
              variant="contained"
              onClick={handleEditFromDetails}
              sx={{
                bgcolor: colors.blueAccent[600],
                '&:hover': { bgcolor: colors.blueAccent[700] },
              }}
            >
              Edit
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DashboardSection;
