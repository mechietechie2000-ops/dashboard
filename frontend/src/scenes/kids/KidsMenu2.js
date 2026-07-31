import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import Header from "../../components/Header";

// Your React component to fetch and display data
console.log("inside KidsMenu.js")


const KidsMenu = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
   const [tasks, setTasks] = useState([]);
   useEffect(() => {
    //axios.get('/data')
    axios.get('http://localhost:5000/getKidsMenu')
      .then(response => {
        console.log(response.data); // Assuming response.data is an array of tasks
        setTasks(response.data); // Update state with fetched data
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, []);

return(
//  <div className="w-100 vh-100 d-flex justify-content-center align-items-center">
    <div className="w-100 vh-100 d-flex justify-content-center">
      <div className='w-50'>
      <table className='table' style={{width:"auto"}}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Meal Type</th>
            <th>Meal Name</th>
            <th>Day of Week</th>
          </tr>
        </thead>
        <tbody>
        {tasks.map((task, index) => {
          return <tr key={index}>
            <td>{task.MEAL_TIME}</td>
            <td>{task.MEAL_TYPE}</td>
            <td>{task.MEAL_NAME}</td>
            <td>{task.DAY_OF_WEEK}</td>
          </tr> 
        })
        }
        </tbody>
      </table>  
      </div>
  </div>
)
};

export default KidsMenu;
