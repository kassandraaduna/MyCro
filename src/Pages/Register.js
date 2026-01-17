import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Register.css';

function Register() {

    const [newMed, setNewMed] = useState({
        fname: "",
        lname: "",
        age: "",
        email: "",
        username: "",
        password: "",
        confirmPassword: ""
    });

    const navigate = useNavigate();

    const handleCreateMed = () => {

        const {
            fname,
            lname,
            age,
            email,
            username,
            password,
            confirmPassword
        } = newMed;

        if (!fname || !lname || !age || !email || !username || !password || !confirmPassword) {
            alert('Please fill all required fields');
            return;
        }

        if (username.length < 8) {
            alert('Username must be at least 8 characters long');
            return;
        }

        if (password.length < 8) {
            alert('Password must be at least 8 characters long');
            return;
        }

        const specialCharRegex = /[!@#$%^&*]/;
        if (!specialCharRegex.test(password)) {
            alert('Password must contain at least one special character');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        const medData = {
            fname,
            lname,
            age,
            email,
            username,
            password
        };

        axios.post('http://localhost:8000/api/addMed', medData)
            .then(() => {
                setNewMed({
                    fname: "",
                    lname: "",
                    age: "",
                    email: "",
                    username: "",
                    password: "",
                    confirmPassword: ""
                });
                alert("Account registered successfully");
            })
            .catch((error) => {
                console.error("Error creating account:", error);
            });
    };

    const handleBackToLogin = () => {
        navigate('/Login');
    };

    return (
        <div className="theBody">
            <div className="regMainCont">
                <h2 className="logHead">REGISTER</h2>

                <div className="loginInputs">

                    <input
                        type="text"
                        placeholder="First Name"
                        value={newMed.fname}
                        onChange={(e) => setNewMed({ ...newMed, fname: e.target.value })}
                    />

                    <input
                        type="text"
                        placeholder="Last Name"
                        value={newMed.lname}
                        onChange={(e) => setNewMed({ ...newMed, lname: e.target.value })}
                    />

                    <input
                        type="number"
                        placeholder="Age"
                        value={newMed.age}
                        onChange={(e) => setNewMed({ ...newMed, age: e.target.value })}
                    />

                    <input
                        type="email"
                        placeholder="Email"
                        value={newMed.email}
                        onChange={(e) => setNewMed({ ...newMed, email: e.target.value })}
                    />

                    <input
                        type="text"
                        placeholder="Username"
                        value={newMed.username}
                        onChange={(e) => setNewMed({ ...newMed, username: e.target.value })}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={newMed.password}
                        onChange={(e) => setNewMed({ ...newMed, password: e.target.value })}
                    />

                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={newMed.confirmPassword}
                        onChange={(e) => setNewMed({ ...newMed, confirmPassword: e.target.value })}
                    />

                </div>

                <button
                    type="button"
                    className="logBtn"
                    onClick={handleCreateMed}
                >
                    REGISTER
                </button>

                <button
                    type="button"
                    className="registerTextBtn"
                    onClick={handleBackToLogin}
                >
                    Already have an account?
                </button>

            </div>
        </div>
    );
}

export default Register;
