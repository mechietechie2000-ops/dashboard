import { Box, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
//import { mockDataTeam } from "../../data/mockData";
// import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
// import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
// import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import Header from "../../components/Header";
import axios from 'axios';
//import getDoctorAppointment from '../../../../backend/server'
import React, { useState, useEffect } from 'react';


const Medical = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  //const [tasks, setTasks] = useState([]);
  const [tableData, setTableData] = useState([]);

   useEffect(() => {
    axios.get('/getDoctorAppointment')
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
    { field: "ID", headerName: "ID", },
    {
      field: "patient_name",
      headerName: "Patient Name",
      type: "number",
      headerAlign: "left",
      align: "left",
    },
    {
      field: "doctor_name",
      headerName: "Doctor Name",
      flex: 1,
    },
    {
      field: "appointment_date",
      headerName: "Appointment Date",
      flex: 1,
    },
    {
      field: "purpose",
      headerName: "Purpose of Visit",
      flex: 1,
    },
    {
      field: "amount_charged",
      headerName: "Amount Charged",
      flex: 1,
    },
    {
      field: "address",
      headerName: "Address",
      flex: 1,
    },
    {
      field: "contact_number",
      headerName: "Contact Number",
      flex: 1,
    },
    {
      field: "doctor_special",
      headerName: "Specialty",
      flex: 1,
    },    
    {
      field: "insurance",
      headerName: "Insurance",
      flex: 1,
    },
  ];

  return (
    <Box m="20px">
      <Header title="Doctor Appointment History" subtitle="Managing doctor appointments" />
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

export default Medical;
