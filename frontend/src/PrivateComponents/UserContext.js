// src/context/UserContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => {
  return useContext(UserContext);
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true); // ✅ Add loading state
  useEffect(() => {
    // Fetch user info on app load
    fetch(`${process.env.REACT_APP_BASE_URL}/profile`, {
      credentials: 'include',
    })
      
.then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(err => {
        console.error('Error fetching profile', err);
        setUser(null);
      })
      .finally(() => setLoading(false)); // ✅ Stop loading
  }, []);


  return (
    <UserContext.Provider value={{ user, setUser,loading }}>
      {children}
    </UserContext.Provider>
  );
};
