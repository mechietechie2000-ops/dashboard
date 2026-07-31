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


const KidsMenu = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  //const [tasks, setTasks] = useState([]);
  const [tableData, setTableData] = useState([]);

   useEffect(() => {
    axios.get('/getKidsMenu')
    //axios.get('http://localhost:5000/getKidsMenu') //This is working for sure, the above started working as well
      .then(response => {
        //console.log(response.data); // Assuming response.data is an array of tasks
        setTableData(response.data); // Update state with fetched data
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, []);

  // useEffect(() => {
  //   //axios.get('/data')
  //   axios.get('http://localhost:5000/getKidsMenu')
  //     .then(response => {
  //       console.log(response.data); // Assuming response.data is an array of tasks
  //     })
  //     .then((data) => {
  //       const rowsWithIds = data.map((row, index) => ({ ...row, id: index + 1 }));

  //       // Set the fetched data to the state
  //       setKidsMenu(rowsWithIds);
  //     })
  //     .catch(error => {
  //       console.error('Error fetching data:', error);
  //     });
  // }, []);

  const columns = [
    { field: "ID", headerName: "ID", },
    {
      field: "MEAL_TIME",
      headerName: "Meal Time",
      flex: 1,
      cellClassName: "name-column--cell",
    },
    {
      field: "MEAL_TYPE",
      headerName: "Meal Type",
      type: "number",
      headerAlign: "left",
      align: "left",
    },
    {
      field: "MEAL_NAME",
      headerName: "Meal Name",
      flex: 1,
    },
    {
      field: "DAY_OF_WEEK",
      headerName: "Day",
      flex: 1,
    },
    // {
    //   field: "accessLevel",
    //   headerName: "Access Level",
    //   flex: 1,
    //   renderCell: ({ row: { access } }) => {
    //     return (
    //       <Box
    //         width="60%"
    //         m="0 auto"
    //         p="5px"
    //         display="flex"
    //         justifyContent="center"
    //         backgroundColor={
    //           access === "admin"
    //             ? colors.greenAccent[600]
    //             : access === "manager"
    //             ? colors.greenAccent[700]
    //             : colors.greenAccent[700]
    //         }
    //         borderRadius="4px"
    //       >
    //         {access === "admin" && <AdminPanelSettingsOutlinedIcon />}
    //         {access === "manager" && <SecurityOutlinedIcon />}
    //         {access === "user" && <LockOpenOutlinedIcon />}
    //         <Typography color={colors.grey[100]} sx={{ ml: "5px" }}>
    //           {access}
    //         </Typography>
    //       </Box>
    //     );
    //   },
    // },
  ];

  return (
    <Box m="20px">
      <Header title="Kiddos Diet Chart" subtitle="Managing the diet plan for kids" />
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

export default KidsMenu;
