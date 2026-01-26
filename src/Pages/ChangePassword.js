import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ChangePassword.css';

function ChangePassword() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const validate = () => {
    const e = {};
    setFormError('');

    if (!user?._id) e.user = 'Missing user session. Please login again.';
    if (!currentPassword) e.currentPassword = 'Current password is required.';
    if (!newPassword) e.newPassword = 'New password is required.';
    if (!confirmNewPassword) e.confirmNewPassword = 'Please confirm your new password.';

    if (newPassword && newPassword.length < 8) {
      e.newPassword = 'New password must be at least 8 characters.';
    }

    if (newPassword && !/[!@#$%^&*]/.test(newPassword)) {
      e.newPassword = 'New password must include a special character (!@#$%^&*).';
    }

    if (newPassword && confirmNewPassword && newPassword !== confirmNewPassword) {
      e.confirmNewPassword = 'Passwords do not match.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setIsLoading(true);
      setFormError('');

      const res = await axios.post('http://localhost:8000/api/auth/change-password', {
        userId: user._id,
        currentPassword,
        newPassword,
      });

      alert(res.data?.message || 'Password updated successfully!');

      const updatedUser = res.data?.data?.user || null;
      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        const patched = { ...user, mustChangePassword: false };
        localStorage.setItem('user', JSON.stringify(patched));
      }

      const finalUser = updatedUser || { ...user, mustChangePassword: false };
      if (finalUser?.role === 'instructor') navigate('/HomeInstructor');
      else navigate('/Homepage');
    } catch (err) {
      console.error(err);
      setFormError(err?.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsLoading(false);
    }
  };

  const backToLogin = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/Login');
  };

  return (
    <div className="cpWrap">
      <div className="cpCard">
        <h2 className="cpTitle">Change Password</h2>
        <p className="cpSub">
          For security, please update your password before continuing.
        </p>

        {errors.user ? <div className="cpError">{errors.user}</div> : null}

        <div className="cpInputs">
          <label className="cpLabel">Current Password</label>
          <input
            className="cpInput"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setErrors((p) => ({ ...p, currentPassword: '' }));
              setFormError('');
            }}
            disabled={isLoading}
            placeholder="Enter current password"
          />
          {errors.currentPassword ? <div className="cpFieldError">{errors.currentPassword}</div> : null}

          <label className="cpLabel" style={{ marginTop: 10 }}>New Password</label>
          <input
            className="cpInput"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setErrors((p) => ({ ...p, newPassword: '', confirmNewPassword: '' }));
              setFormError('');
            }}
            disabled={isLoading}
            placeholder="At least 8 chars + special char"
          />
          {errors.newPassword ? <div className="cpFieldError">{errors.newPassword}</div> : null}

          <label className="cpLabel" style={{ marginTop: 10 }}>Confirm New Password</label>
          <input
            className="cpInput"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => {
              setConfirmNewPassword(e.target.value);
              setErrors((p) => ({ ...p, confirmNewPassword: '' }));
              setFormError('');
            }}
            disabled={isLoading}
            placeholder="Confirm new password"
          />
          {errors.confirmNewPassword ? <div className="cpFieldError">{errors.confirmNewPassword}</div> : null}
        </div>

        {formError ? <div className="cpError" style={{ marginTop: 10 }}>{formError}</div> : null}

        <button className="cpBtn" type="button" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'PLEASE WAIT...' : 'Update Password'}
        </button>

        <button className="cpLinkBtn" type="button" onClick={backToLogin} disabled={isLoading}>
          Back to login
        </button>
      </div>
    </div>
  );
}

export default ChangePassword;
