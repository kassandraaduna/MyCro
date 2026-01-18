import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Register.css';

function Register() {
  const [newMed, setNewMed] = useState({
    fname: "",
    lname: "",
    dob: "",          
    gender: "",       
    number: "",       
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setNewMed((prev) => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const validate = () => {
    const {
      fname,
      lname,
      dob,
      gender,
      number,
      email,
      username,
      password,
      confirmPassword
    } = newMed;

    const trimmedFname = fname.trim();
    const trimmedLname = lname.trim();
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    const trimmedGender = gender.trim();
    const trimmedNumber = number.trim();

    if (
      !trimmedFname ||
      !trimmedLname ||
      !dob ||
      !trimmedGender ||
      !trimmedNumber ||
      !trimmedEmail ||
      !trimmedUsername ||
      !password ||
      !confirmPassword
    ) {
      return 'Please fill all required fields.';
    }

    const dobDate = new Date(dob);
    if (Number.isNaN(dobDate.getTime())) {
      return 'Please enter a valid Date of Birth.';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dobDate > today) {
      return 'Date of Birth cannot be in the future.';
    }

    const allowedGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
    if (!allowedGenders.includes(trimmedGender)) {
      return 'Please select a valid gender.';
    }

    const phoneDigits = trimmedNumber.replace(/[^\d]/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return 'Please enter a valid phone number (7 to 15 digits).';
    }
    const phoneRegex = /^\+?[0-9\s-()]+$/;
    if (!phoneRegex.test(trimmedNumber)) {
      return 'Phone number contains invalid characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return 'Please enter a valid email address.';
    }

    if (trimmedUsername.length < 8) {
      return 'Username must be at least 8 characters long.';
    }

    if (password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }

    const specialCharRegex = /[!@#$%^&*]/;
    if (!specialCharRegex.test(password)) {
      return 'Password must contain at least one special character.';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }

    return null;
  };

  const handleCreateMed = async () => {
    const errorMsg = validate();
    if (errorMsg) {
      alert(errorMsg);
      return;
    }

    const medData = {
      fname: newMed.fname.trim(),
      lname: newMed.lname.trim(),
      dob: newMed.dob,                 
      gender: newMed.gender.trim(),    
      number: newMed.number.trim(),    
      email: newMed.email.trim(),
      username: newMed.username.trim(),
      password: newMed.password
    };

    try {
      setIsSubmitting(true);

      await axios.post('http://localhost:8000/api/addMed', medData);

      setNewMed({
        fname: "",
        lname: "",
        dob: "",
        gender: "",
        number: "",
        email: "",
        username: "",
        password: "",
        confirmPassword: ""
      });

      alert("Account registered successfully!");
      navigate('/Login'); 
    } catch (error) {
      console.error("REGISTER ERROR:", error);

      if (error.response) {
        console.log("STATUS:", error.response.status);
        console.log("DATA:", error.response.data);

        alert(
          `Status: ${error.response.status}\n` +
          `Response: ${JSON.stringify(error.response.data)}`
        );
      } else if (error.request) {
        alert('No response from server. Check if backend is running.');
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
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
            onChange={handleChange('fname')}
          />

          <input
            type="text"
            placeholder="Last Name"
            value={newMed.lname}
            onChange={handleChange('lname')}
          />

          <input
            type="date"
            placeholder="Date of Birth"
            value={newMed.dob}
            onChange={handleChange('dob')}
          />

          <select
            value={newMed.gender}
            onChange={handleChange('gender')}
            className="regSelect"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>

          <input
            type="tel"
            placeholder="Phone Number"
            value={newMed.number}
            onChange={handleChange('number')}
          />

          <input
            type="email"
            placeholder="Email"
            value={newMed.email}
            onChange={handleChange('email')}
          />

          <input
            type="text"
            placeholder="Username"
            value={newMed.username}
            onChange={handleChange('username')}
          />

          <input
            type="password"
            placeholder="Password"
            value={newMed.password}
            onChange={handleChange('password')}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={newMed.confirmPassword}
            onChange={handleChange('confirmPassword')}
          />
        </div>

        <button
          type="button"
          className="logBtn"
          onClick={handleCreateMed}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'REGISTERING...' : 'REGISTER'}
        </button>

        <button
          type="button"
          className="registerTextBtn"
          onClick={handleBackToLogin}
          disabled={isSubmitting}
        >
          Already have an account? Login here.
        </button>
      </div>
    </div>
  );
}

export default Register;
