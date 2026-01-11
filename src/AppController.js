import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from './Pages/Login.js';
import Home from './Pages/Home.js';
import Register from './Pages/Register.js';
import SplashScreen from './Pages/SplashScreen.js';




const AppController = () => {
  return (
    <BrowserRouter>
    <Routes>

        <Route path="/" element={<SplashScreen />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Register" element={<Register />} />
        <Route path="/Homepage" element={<Home />} />
        
      </Routes>
    </BrowserRouter>
  );
};

export default AppController;
