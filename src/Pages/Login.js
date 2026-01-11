import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; 
import './Login.css';


function Login() {
    const [med, setMed] = useState([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const navigate = useNavigate();

    function fetchUsers() {
        return axios.get('http://localhost:8000/api/getMed')
            .then((response) => {
                setMed(response.data);
                return response.data;
            })
            .catch((error) => {
                console.log(error);
                return [];
            });
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    async function handleLogin() {
        const userInput = username.trim();
        const passInput = password.trim();

        if (userInput === '' || passInput === '') {
            alert('Please enter both username and password');
            return;
        }

        if (userInput === 'admin' && passInput === 'admin') {
            navigate('/Adminpanel');
            return;
        }

        const users = await fetchUsers();


        const emp = users.find(e => String(e.username).trim() === userInput);

        if (!emp) {
            alert('Invalid Credentials');
            return;
        }

        if (String(emp.password).trim() !== passInput) {
            alert('Invalid Credentials');
            return;
        }

        setUsername('');
        setPassword('');

        navigate('/Homepage', {
            state: { employee: emp }
        });
    }

    function handleRegister() {
        navigate('/Register'); 
    }

    return (
        <>
            <div className="theBody">
                <div className="loginMainCont">
                    <h2 className="logHead">LOG-IN</h2>

                    <div className="loginInputs">
                        <input 
                            type="text" 
                            required 
                            autoComplete="off" 
                            placeholder="Username" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />

                        <input 
                            type="password" 
                            required 
                            autoComplete="off" 
                            placeholder="Password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="logBtn" 
                        onClick={handleLogin}
                    >
                        LOG-IN
                    </button>

                    <button
                        type="button"
                        className="registerTextBtn"
                        onClick={handleRegister}
                    >
                        Register
                    </button>
                </div>
            </div>
        </>
    );
}

export default Login;
