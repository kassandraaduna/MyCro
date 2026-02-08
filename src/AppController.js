import React from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';

import Login from './Pages/Login.js';
import HomeStudent from './Pages/HomeStudent.js';
import Register from './Pages/Register.js';
import SplashScreen from './Pages/SplashScreen.js';
import Admin from './AdminPages/Admin.js';
import LandingPage from './Pages/LandingPage';
import HomeInstructor from './Pages/HomeInstructor.js';
import ChangePassword from './Pages/ChangePassword.js';

const AppRoutes = () => {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/landing" element={<LandingPage />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/homestudent" element={<HomeStudent />} />
        <Route path="/adminpanel" element={<Admin />} />
        <Route path="/homeinstructor" element={<HomeInstructor />} />
        <Route path="/changepass" element={<ChangePassword />} />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      )}
    </>
  );
};

const AppController = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default AppController;
