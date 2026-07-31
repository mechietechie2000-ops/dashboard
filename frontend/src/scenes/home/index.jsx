import { Box, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import DashboardSection from "../../components/DashboardSection";
import QueryBuilderIcon from "@mui/icons-material/QueryBuilder";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import SportsHandballRoundedIcon from "@mui/icons-material/SportsHandballRounded";
import LocalLibraryOutlinedIcon from "@mui/icons-material/LocalLibraryOutlined";

import {
  routineItems,
  reminderItems,
  goalItems,
  eventItems,
  appointmentItems,
  renewalItems,
  billItems,
  extraCurriculumItems,
  libraryItems,
} from "../../data/homeDashboardMockData";

const HomeDashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box m="20px">
      <Header title="HOME" subtitle="Welcome back!" />

      <Box
        display="grid"
        gridTemplateColumns={{
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
        }}
        gridAutoRows="minmax(240px, auto)"
        gap="20px"
        mt="10px"
      >
        <DashboardSection
          title="Routine"
          icon={<QueryBuilderIcon />}
          items={routineItems}
          emptyMessage="No routine items today"
          viewAllLink="/routine"
        />

        <DashboardSection
          title="Reminders"
          icon={<NotificationsActiveOutlinedIcon />}
          items={reminderItems}
          emptyMessage="No reminders"
        />

        <DashboardSection
          title="Goals"
          icon={<EmojiEventsOutlinedIcon />}
          items={goalItems}
          emptyMessage="No goals set yet"
        />

        <DashboardSection
          title="Events (Birthdays, Anniversaries)"
          icon={<CakeOutlinedIcon />}
          items={eventItems}
          emptyMessage="No upcoming birthdays or anniversaries"
          viewAllLink="/calendar"
        />

        <DashboardSection
          title="Appointments"
          icon={<LocalHospitalIcon />}
          items={appointmentItems}
          emptyMessage="No upcoming appointments"
          viewAllLink="/medical"
        />

        <DashboardSection
          title="Renewals"
          icon={<AutorenewOutlinedIcon />}
          items={renewalItems}
          emptyMessage="Nothing due for renewal"
        />

        <DashboardSection
          title="Upcoming Payments / Bills"
          icon={<PaymentsOutlinedIcon />}
          items={billItems}
          emptyMessage="No upcoming bills"
        />

        <DashboardSection
          title="Extra Curriculum Registrations"
          icon={<SportsHandballRoundedIcon />}
          items={extraCurriculumItems}
          emptyMessage="No open registrations"
          viewAllLink="/sports"
        />

        <DashboardSection
          title="Library Return Day"
          icon={<LocalLibraryOutlinedIcon />}
          items={libraryItems}
          emptyMessage="No books currently borrowed"
        />
      </Box>
    </Box>
  );
};

export default HomeDashboard;