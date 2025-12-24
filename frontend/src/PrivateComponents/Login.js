import React, { useState, useEffect } from 'react';
import '../styles/NewLogin.css';
import logo from '../images/ocado_logo1.svg';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import {jwtDecode} from 'jwt-decode';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import eyeOpen from '../images/eyeopen.png';
import eyeClose from '../images/eyeclose.png';
import Microsoft_logo from '../images/Microsoft_logo.svg';
import { useUser } from './UserContext';

const LoginPage = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useLocalAuth, setUseLocalAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { setUser } = useUser();

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedPassword = localStorage.getItem('password');
    if (storedUserId && storedPassword) {
      setUserId(storedUserId);
      setPassword(storedPassword);
      console.log(rememberMe)
      setRememberMe(true);
    }

    // Check which auth mode is active
    axios.get(`${process.env.REACT_APP_BASE_URL}/auth/mode`)
      .then(response => {
        setUseLocalAuth(response.data.useLocalAuth);
        console.log('Auth mode:', response.data.authMode);
      })
      .catch(error => {
        console.error('Error checking auth mode:', error);
        // Default to SAML if endpoint fails
        setUseLocalAuth(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const redirectToSAMLLogin = () => {
    window.location.href=`${process.env.REACT_APP_BASE_URL}/login`
    // window.location.href = "https://adminportal-dot-orl-tst-ccai-prj01.uc.r.appspot.com/auth/saml";
    //window.location.href = "http://localhost:5000/auth/saml";
    //window.location.href = "http://localhost:3000/landing";

  };
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!userId || !password) {
      setError('Username and password cannot be empty.');
      return;
    }

    const data = {
      emailId: userId,
      password: password,
    };

    try {
      const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/user_auth`, data, {
        withCredentials: true  // ✅ Important: This allows cookies to be set and sent
      });

      if (response.status === 200 && response.data.emergency.authenticated === true) {
        const name = response.data.emergency.userName;
        localStorage.setItem('username', name);
        if (rememberMe) {
          localStorage.setItem('userId', userId);
          localStorage.setItem('password', password);
        } else {
          localStorage.removeItem('userId');
          localStorage.removeItem('password');
        }

        // Fetch user profile to update UserContext
        try {
          const profileResponse = await axios.get(`${process.env.REACT_APP_BASE_URL}/profile`, {
            withCredentials: true
          });

          if (profileResponse.data.user) {
            setUser(profileResponse.data.user);
          }
        } catch (profileError) {
          console.error('Error fetching profile after login:', profileError);
        }

        navigate('/landing');
      } else {
        setError('Incorrect credentials. Please enter the correct username and password.');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setError('Incorrect credentials. Please enter the correct username and password.');
      } else {
        console.error('Error authenticating user:', error);
        setError('Login failed. Please try again.');
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleLogin(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleLogin]);

  if (isLoading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <img className="login-ocado-image" src={logo} alt="Logo" style={{cursor:"pointer"}}/>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <img className="login-ocado-image" src={logo} alt="Logo" onClick={() => window.location.reload()} style={{cursor:"pointer"}}/>

          <div className='input-group'>
            <label htmlFor="username" className='login-input-lable'>Username</label>
          </div>
          <input
            type="text"
            id="username"
            name="log"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="input-field"
            required
          />
          <div className="input-group">
            <label htmlFor="password" className='login-input-lable'>Password</label>
          </div>
          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="pwd"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
            <span className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <img style={{width:"25px",height:"20px",border:"1px solid #0a4b78"}}src={eyeClose}></img> : <img style={{width:"25px",height:"20px"}} src={eyeOpen}></img> }
            </span>
          </div>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Only show Microsoft SAML button if NOT using local auth */}
          {!useLocalAuth && (
            <div style={{marginTop:"10px",display:"grid"}}>
              <button
                href="#"
                onClick={redirectToSAMLLogin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'white',
                  color: "#5E5E5E",
                  fontSize: '16px',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                <img
                  src={Microsoft_logo}
                  alt="Microsoft Logo"
                  style={{
                    marginRight: '10px',
                    width: '20px',
                    height: '20px',
                  }}
                />
                Sign in with Microsoft
              </button>
            </div>
          )}


        <div style={{display:"flex",justifyContent:"right",marginTop:"20px"}}>
          <button
            type="submit"
            className="login-button"
            onClick={useLocalAuth ? handleLogin : redirectToSAMLLogin}
          >
            <b>Log In</b>
          </button>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;