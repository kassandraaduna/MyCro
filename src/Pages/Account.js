import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './Account.css';

function AccountSettings() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialUser = useMemo(() => {
    if (location.state?.employee) return location.state.employee;
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [location.state]);

  const userId = initialUser?._id || '';

  const [saved, setSaved] = useState({
    fname: initialUser?.fname || '',
    lname: initialUser?.lname || '',
    email: initialUser?.email || '',
    number: initialUser?.number || '',
  });

  const [draft, setDraft] = useState({ ...saved });

  const [editName, setEditName] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [editNumber, setEditNumber] = useState(false);
  const [editPassword, setEditPassword] = useState(false);

  const [passDraft, setPassDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');

  const [savingKey, setSavingKey] = useState('');

  const onDraftChange = (field) => (e) =>
    setDraft((p) => ({ ...p, [field]: e.target.value }));

  const onPassChange = (field) => (e) =>
    setPassDraft((p) => ({ ...p, [field]: e.target.value }));

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert('Image is too large. Max 3MB.');
      return;
    }

    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const putUpdate = async (payload) => {
  if (!userId) {
    alert('Walang userId. Mag-login ulit.');
    navigate('/Login');
    return;
  }

  const url = `http://localhost:8000/api/meds/${userId}`;
  console.log('PUT URL:', url);
  console.log('PAYLOAD:', payload);

  const res = await axios.put(url, payload);
  return res.data;
};
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email.trim())) return 'Invalid email address.';
    return null;
  };

  const validateNumber = (number) => {
    const digits = number.replace(/[^\d]/g, '');
    if (digits.length < 7 || digits.length > 15) {
      return 'Phone number must be 7–15 digits.';
    }
    return null;
  };

  const validatePassword = () => {
    const { currentPassword, newPassword, confirmNewPassword } = passDraft;
    if (!currentPassword) return 'Enter your current password.';
    if (!newPassword) return 'Enter your new password.';
    if (newPassword.length < 8) return 'Password must be at least 8 characters.';
    if (!/[!@#$%^&*]/.test(newPassword)) return 'Must contain a special character.';
    if (newPassword !== confirmNewPassword) return 'Passwords do not match.';
    return null;
  };

  const saveName = async () => {
    try {
      setSavingKey('name');
      const updated = await putUpdate({
        fname: draft.fname.trim(),
        lname: draft.lname.trim(),
      });

      setSaved((p) => ({ ...p, fname: updated.fname, lname: updated.lname }));
      setDraft((p) => ({ ...p, fname: updated.fname, lname: updated.lname }));
      localStorage.setItem('user', JSON.stringify(updated));
      setEditName(false);
      alert('Name updated!');
    } finally {
      setSavingKey('');
    }
  };

  const saveEmail = async () => {
    const err = validateEmail(draft.email);
    if (err) return alert(err);

    try {
      setSavingKey('email');
      const updated = await putUpdate({ email: draft.email.trim() });
      setSaved((p) => ({ ...p, email: updated.email }));
      setDraft((p) => ({ ...p, email: updated.email }));
      localStorage.setItem('user', JSON.stringify(updated));
      setEditEmail(false);
      alert('Email updated!');
    } finally {
      setSavingKey('');
    }
  };

  const saveNumber = async () => {
    const err = validateNumber(draft.number);
    if (err) return alert(err);

    try {
      setSavingKey('number');
      const updated = await putUpdate({ number: draft.number.trim() });
      setSaved((p) => ({ ...p, number: updated.number }));
      setDraft((p) => ({ ...p, number: updated.number }));
      localStorage.setItem('user', JSON.stringify(updated));
      setEditNumber(false);
      alert('Number updated!');
    } finally {
      setSavingKey('');
    }
  };

  const savePassword = async () => {
    const err = validatePassword();
    if (err) return alert(err);

    try {
      setSavingKey('password');

      await axios.post('http://localhost:8000/api/auth/change-password', {
        userId,
        currentPassword: passDraft.currentPassword,
        newPassword: passDraft.newPassword,
      });

      setPassDraft({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setEditPassword(false);
      alert('Password updated securely!');
    } catch (error) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
        'Failed to update password.'
      );
    } finally {
      setSavingKey('');
    }
  };

  const handleBack = () => navigate('/Homepage');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/Login');
  };

  return (
    <div className="theBody">
      <div className="accWrap">
        <div className="accTop">
          <div>
            <h2 className="accTitle">Account Settings</h2>
          </div>

          <div className="accTopBtns">
            <button className="ghostBtn" onClick={handleBack}>Back</button>
            <button className="dangerBtn" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div className="accGrid">
          <div className="card">
            <h3 className="cardTitle">Profile Photo</h3>
            <div className="profileBox">
              <div className="profileCircle">
                {profilePreview ? <img src={profilePreview} alt="preview" /> : '👤'}
              </div>
              <label className="uploadBtn">
                Upload Photo
                <input type="file" onChange={onPickImage} />
              </label>
            </div>
          </div>

          <div className="card">
            <h3 className="cardTitle">Name</h3>
            <input disabled={!editName} value={draft.fname} onChange={onDraftChange('fname')} />
            <input disabled={!editName} value={draft.lname} onChange={onDraftChange('lname')} />
            {!editName
              ? <button onClick={() => setEditName(true)}>Edit</button>
              : <button onClick={saveName}>Save</button>}
          </div>

          <div className="card">
            <h3 className="cardTitle">Email</h3>
            <input disabled={!editEmail} value={draft.email} onChange={onDraftChange('email')} />
            {!editEmail
              ? <button onClick={() => setEditEmail(true)}>Edit</button>
              : <button onClick={saveEmail}>Save</button>}
          </div>

          <div className="card">
            <h3 className="cardTitle">Number</h3>
            <input disabled={!editNumber} value={draft.number} onChange={onDraftChange('number')} />
            {!editNumber
              ? <button onClick={() => setEditNumber(true)}>Edit</button>
              : <button onClick={saveNumber}>Save</button>}
          </div>

          <div className="card">
            <h3 className="cardTitle">Password</h3>
            {editPassword && (
              <>
                <input type="password" placeholder="Current" value={passDraft.currentPassword} onChange={onPassChange('currentPassword')} />
                <input type="password" placeholder="New" value={passDraft.newPassword} onChange={onPassChange('newPassword')} />
                <input type="password" placeholder="Confirm" value={passDraft.confirmNewPassword} onChange={onPassChange('confirmNewPassword')} />
              </>
            )}
            {!editPassword
              ? <button onClick={() => setEditPassword(true)}>Change</button>
              : <button onClick={savePassword}>Save</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountSettings;
