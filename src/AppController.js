import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from './Pages/Login.js';
import HomeStudent from './Pages/HomeStudent.js';
import Register from './Pages/Register.js';
import SplashScreen from './Pages/SplashScreen.js';
import Admin from './AdminPages/Admin.js';
import LandingPage from './Pages/LandingPage';
import HomeInstructor from './Pages/HomeInstructor.js';
import ChangePassword from './Pages/ChangePassword.js';



const AppController = () => {
  return (
    <BrowserRouter>
    <Routes>

        <Route path="/" element={<SplashScreen />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Register" element={<Register />} />
        <Route path="/Homepage" element={<HomeStudent />} />
        <Route path="/Landing" element={<LandingPage />} />
        <Route path="/AdminPanel" element={<Admin />} />
        <Route path='/HomeInstructor' element={<HomeInstructor />} />
        <Route path='/ChangePass' element={<ChangePassword />} />

        
      </Routes>
    </BrowserRouter>
  );
};

export default AppController;
