// PrivateLayout.js
import React from 'react';
import Header from './Header';
import Footer from './Footer';
const PrivateLayout = ({ children }) => {
  return (
    <div>
      <Header />
      {children}
      <Footer />
    </div>
  );
};
 
export default PrivateLayout;