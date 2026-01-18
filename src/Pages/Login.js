import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    const userInput = usernameOrEmail.trim();
    const passInput = password; 

    if (!userInput || !passInput) {
      alert('Please enter your username/email and password.');
      return;
    }

    if (userInput === 'admin' && passInput === 'admin') {
      setUsernameOrEmail('');
      setPassword('');
      navigate('/Adminpanel');
      return;
    }

    try {
      setIsLoading(true);

      const res = await axios.post('http://localhost:8000/api/auth/login', {
        usernameOrEmail: userInput,
        password: passInput,
      });

      alert(res.data?.message || 'Login successful');

      const token = res.data?.data?.token;
      if (token) localStorage.setItem('token', token);

      const user = res.data?.data?.user || null;
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }

      setUsernameOrEmail('');
      setPassword('');

      navigate('/Homepage', {
        state: { employee: user },
      });
    } catch (error) {
      console.error('Login error:', error);

      const msg =
        error?.response?.data?.message ||
        'Login failed. Please try again.';

      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    navigate('/Register');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="theBody">
      <div className="loginMainCont">
        <h2 className="logHead">LOG-IN</h2>

        <div className="loginInputs">
          <input
            type="text"
            required
            autoComplete="off"
            placeholder="Username or Email"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />

          <input
            type="password"
            required
            autoComplete="off"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
        </div>

        <button
          type="button"
          className="logBtn"
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? 'LOGGING IN...' : 'LOG-IN'}
        </button>

        <button
          type="button"
          className="registerTextBtn"
          onClick={handleRegister}
          disabled={isLoading}
        >
          Haven't registered yet? Register
        </button>
      </div>
    </div>
  );
}

export default Login;
