// // PrivateRoute.js
// import React from 'react';
// import { Navigate } from 'react-router-dom';
 
// const PrivateRoute = ({ children }) => {
//   const username = localStorage.getItem('username');
//   return username ? children : <Navigate to="/" />;
// };
 
// export default PrivateRoute;
// components/PrivateRoute.js
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
 
const PrivateRoute = ({ children }) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
 
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_BASE_URL}/profile`, {
      withCredentials: true,
    })
      .then(() => {
        setIsAuthenticated(true);
        setAuthChecked(true);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setAuthChecked(true);
        window.location.href = "https://adminwebportal-dot-orl-tst-ccai-prj01.uc.r.appspot.com/login";
      });
  }, []);
 
  if (!authChecked) return null; // or a loading spinner
 
  return isAuthenticated ? children : null;
};
 
export default PrivateRoute;