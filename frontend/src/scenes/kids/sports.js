import { Box, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
//import { mockDataTeam } from "../../data/mockData";
// import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
// import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
// import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import Header from "../../components/Header";
import axios from 'axios';
//import getKidsMenu from '../../../../backend/server'
import React, { useState, useEffect } from 'react';


const Sports = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  //const [tasks, setTasks] = useState([]);
  const [tableData, setTableData] = useState([]);

   useEffect(() => {
    axios.get('/getSportSchedule')
    //axios.get('http://localhost:5000/getKidsMenu') //This is working for sure, the above started working as well
      .then(response => {
        //console.log(response.data); // Assuming response.data is an array of tasks
        setTableData(response.data); // Update state with fetched data
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, []);

  const columns = [
    //{ field: "ID", headerName: "ID", },
    // {
    //   field: "ACTIVITY_CODE",
    //   headerName: "ACTIVITY_CODE",
    //   flex: 1,
    // },
    {
      field: "ACTIVITY_NAME",
      headerName: "Activity Name",
      flex: 1,
    },
    {
      field: "ACTIVITY_FOR",
      headerName: "Person Name",
      flex: 1,
    },
    {
      field: "LEVEL",
      headerName: "Level",
      flex: 1,
    },
    {
      field: "DAY_OF_WEEK",
      headerName: "Day Of The Week",
      flex: 1,
    },
    {
      field: "TIME_SLOT",
      headerName: "Timing",
      flex: 1,
    },
    {
      field: "DURATION",
      headerName: "Duration",
      flex: 1,
    },
    {
      field: "FREQUENCY",
      headerName: "Frequency",
      flex: 1,
    },
    {
      field: "START_DATE",
      headerName: "Start Date",
      flex: 1,
    },
    {
      field: "END_DATE",
      headerName: "End Date",
      flex: 1,
    },
    // {
    //   field: "SPECIAL_EVENT_DATE",
    //   headerName: "SPECIAL_EVENT_DATE",
    //   flex: 1,
    // },
    {
      field: "FACILITY_NAME",
      headerName: "Facility",
      flex: 1,
    },
    // {
    //   field: "ADDRESS",
    //   headerName: "ADDRESS",
    //   flex: 1,
    // },
    // {
    //   field: "PHONE_NUMBER",
    //   headerName: "PHONE_NUMBER",
    //   flex: 1,
    // },
    // {
    //   field: "MONTHLY_FEES",
    //   headerName: "MONTHLY_FEES",
    //   flex: 1,
    // },
    // {
    //   field: "REGISTRATION_FEES",
    //   headerName: "REGISTRATION_FEES",
    //   flex: 1,
    // },
    // {
    //   field: "OTHER_EXPENSES",
    //   headerName: "OTHER_EXPENSES",
    //   flex: 1,
    // },
    {
      field: "GEAR_LIST",
      headerName: "Gears",
      flex: 1,
    },
  ];

  return (
    <Box m="20px">
      <Header title="Sport Activities" subtitle="Managing the sports plan for kids" />
      <Box
        m="40px 0 0 0"
        height="75vh"
        sx={{
          "& .MuiDataGrid-root": {
            border: "none",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "none",
          },
          "& .name-column--cell": {
            color: colors.greenAccent[300],
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            borderBottom: "none",
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: colors.primary[400],
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.blueAccent[700],
          },
          "& .MuiCheckbox-root": {
            color: `${colors.greenAccent[200]} !important`,
          },
        }}
      >
        <DataGrid checkboxSelection rows={tableData} columns={columns} getRowId={(row) =>  generateRandom()} />
        {/* <DataGrid getRowId={(row) => row.statId} checkboxSelection rows={tableData} columns={columns} />  */}
      </Box>
    </Box>
  );
};

function generateRandom() {
  var length = 8,
      charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      retVal = "";
  for (var i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

export default Sports;
