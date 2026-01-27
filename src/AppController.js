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
        <Route path="/Landing" element={<LandingPage />} />

        <Route path="/Login" element={<Login />} />
        <Route path="/Register" element={<Register />} />

        <Route path="/Homepage" element={<HomeStudent />} />
        <Route path="/AdminPanel" element={<Admin />} />
        <Route path="/HomeInstructor" element={<HomeInstructor />} />
        <Route path="/ChangePass" element={<ChangePassword />} />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route path="/Login" element={<Login />} />
          <Route path="/Register" element={<Register />} />
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
