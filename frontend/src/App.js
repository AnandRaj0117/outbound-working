import React from 'react';
import Modal from 'react-modal';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import Login from './PrivateComponents/Login';
import './App.css';
import { useUser } from './PrivateComponents/UserContext';
import Header from './PrivateComponents/Header';
import Dashboard from "./pages/Dashboard";
import DashboardHome from "./pages/DashboardHome";

Modal.setAppElement('#root');

const App = () => {

  const { user, loading } = useUser();
if (loading) return <div>Loading...</div>;

  return (
    <>
      {/* {user && <Header />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/landing" element={user ? <LandingPage /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes> */}
      <Routes>
      {/* Redirect logged-in users from login to landing */}
      <Route
        path="/"
        element={user ? <Navigate to="/landing" /> : <Login />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/landing" /> : <Login />}
      />

      {/* Protected routes with Header */}
      {user && (
        <>
          <Route
            path="/landing"
            element={
              <>
                <Header />
                <DashboardHome user={user}  />
              </>
            }
          />
         
          <Route
            path="/create-campaign"
            element={
              <>
                <Header />
                <Dashboard user={user} />
              </>
            }
          />
        </>
      )}

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to={user ? "/landing" : "/login"} />} />
    </Routes>
    </>
  );
};

export default App;
