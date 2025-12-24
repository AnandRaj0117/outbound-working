// Header.js
import React, { useState, useEffect } from 'react';
import '../styles/Header.css';
import ocadoLogo from '../images/logo_white.png'
import adminImage from '../images/adminImage.png'
import exit from '../images/exit.png'
import { useNavigate } from 'react-router-dom'
import { Tooltip as ReactTooltip } from "react-tooltip";
import { useUser } from './UserContext';

const Header = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const goToLandingPage = () => {
    navigate('/landing')
  }


  const handleSignOut = () => {
    fetch(`${process.env.REACT_APP_BASE_URL}/logout`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(res => {
        if (res.ok) {
          setUser(null);
          navigate('/');
        }
      })
      .catch(err => console.error('Logout error', err));
  };
  return (
    <header className="header">
      <div className="left">
        <img src={ocadoLogo} alt="icon" onClick={goToLandingPage} style={{ cursor: "pointer" }} />
      </div>
      <div className="right">
        <img style={{ cursor: "pointer" }} src={adminImage} alt="admin" className="signout-icon" />
        <span style={{ cursor: "pointer" }} className="username">{user.firstName} {user.lastName}</span>
        <img style={{ cursor: "pointer" }} data-tooltip-id="logout" src={exit} alt="sign out" className="signout-icon" onClick={handleSignOut} />
      </div>
      <ReactTooltip
        id="logout"
        place="top"
        content="Logout"
        className='toggleOnAndOff'
      />
    </header>
  );
};

export default Header;