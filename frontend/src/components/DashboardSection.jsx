import { Box, Typography, useTheme } from "@mui/material";
import { Link } from "react-router-dom";
import { tokens } from "../theme";

/**
 * A single dashboard panel: header (icon + title + optional "View all" link)
 * followed by a vertical list of single-line items, or an empty-state message
 * when there's nothing to show.
 *
 * Each item is expected to look like:
 *   { id, primary, secondary?, meta? }
 * - primary: main line of text (e.g. "Mom's Birthday")
 * - secondary: smaller supporting text under primary (e.g. "Birthday")
 * - meta: right-aligned text, usually a date/amount (e.g. "Aug 12")
 *
 * Pass a custom `renderItem(item, index)` if a section needs a different
 * row layout than the default.
 */
const DashboardSection = ({
  title,
  icon,
  items = [],
  emptyMessage = "Nothing here yet",
  viewAllLink,
  renderItem,
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const defaultRenderItem = (item, i) => (
    <Box
      key={item.id ?? i}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      borderBottom={
        i === items.length - 1 ? "none" : `1px solid ${colors.primary[500]}`
      }
      py="10px"
      gap="10px"
    >
      <Box minWidth={0}>
        <Typography
          color={colors.grey[100]}
          fontWeight="600"
          noWrap
          title={item.primary}
        >
          {item.primary}
        </Typography>
        {item.secondary && (
          <Typography variant="body2" color={colors.grey[300]} noWrap>
            {item.secondary}
          </Typography>
        )}
      </Box>
      {item.meta && (
        <Typography
          variant="body2"
          color={colors.greenAccent[500]}
          whiteSpace="nowrap"
        >
          {item.meta}
        </Typography>
      )}
    </Box>
  );

  return (
    <Box
      backgroundColor={colors.primary[400]}
      borderRadius="4px"
      p="20px"
      display="flex"
      flexDirection="column"
      height="100%"
    >
      {/* HEADER */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb="10px"
        pb="10px"
        borderBottom={`3px solid ${colors.primary[500]}`}
      >
        <Box display="flex" alignItems="center" gap="10px">
          <Box
            color={colors.greenAccent[500]}
            display="flex"
            alignItems="center"
          >
            {icon}
          </Box>
          <Typography variant="h5" fontWeight="600" color={colors.grey[100]}>
            {title}
          </Typography>
        </Box>
        {viewAllLink && (
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
        )}
      </Box>

      {/* BODY */}
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
    </Box>
  );
};

export default DashboardSection;