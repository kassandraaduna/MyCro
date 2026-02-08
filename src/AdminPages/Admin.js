import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

function Admin() {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('Dashboard');
  const [sideOpen, setSideOpen] = useState(true);

  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [editingId, setEditingId] = useState('');
  const [editDraft, setEditDraft] = useState({
    fname: '',
    lname: '',
    email: '',
    number: '',
    username: '',
    role: '',
  });

  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    fname: '',
    lname: '',
    email: '',
    number: '',
    username: '',
    dob: '',
    gender: 'Male',
    tempPassword: '',
  });

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [viewEditMode, setViewEditMode] = useState(false);

  const [activityType, setActivityType] = useState('All Activities');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const USERS_PAGE_SIZE = 8;
  const LOGS_PAGE_SIZE = 8;
  const [usersPage, setUsersPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);

  const sanitizeName = (value) => String(value || '').replace(/[^a-zA-Z\s'-]/g, '');

  const sanitizePhone = (value) => {
    const digitsOnly = String(value || '').replace(/\D/g, '');
    return digitsOnly.slice(0, 11);
  };

  const actorPayload = useMemo(() => {
    let admin = null;
    try {
      const raw = localStorage.getItem('user');
      admin = raw ? JSON.parse(raw) : null;
    } catch {
      admin = null;
    }

    const actorName =
      `${admin?.fname || ''} ${admin?.lname || ''}`.trim() ||
      admin?.username ||
      'Admin';

    return {
      actorUser: admin?._id || null,
      actorName,
      actorRole: admin?.role || 'admin',
      actorEmail: admin?.email || '',
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/Landing');
  };

  const handleNav = (name) => {
    setActive(name);
    setSearch('');
    setUsersPage(1);
    setLogsPage(1);
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await axios.get('http://localhost:8000/api/admin/users');
      const list = Array.isArray(res.data) ? res.data : [];
      setUsers(list);
      return list;
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to load users.');
      return [];
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await axios.get('http://localhost:8000/api/admin/logs');
      const list = Array.isArray(res.data) ? res.data : [];
      setLogs(list);
      return list;
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to load logs.');
      return [];
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, []);

  useEffect(() => {
    setUsersPage(1);
  }, [search]);

  useEffect(() => {
    setLogsPage(1);
  }, [search, activityType, fromDate, toDate]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) => {
      const full = `${u.fname || ''} ${u.lname || ''}`.toLowerCase();
      return (
        full.includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.number || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  const normalizeAction = (l) => {
    const a = (l.action || l.type || '').toLowerCase();
    if (a.includes('login')) return 'Login';
    if (a.includes('register') || a.includes('signup')) return 'Registration';
    if (a.includes('create instructor')) return 'Create Instructor';
    if (a.includes('created instructor')) return 'Create Instructor';
    if (a.includes('deactivate') || a.includes('activate') || a.includes('status')) return 'Status Change';
    if (a.includes('update') || a.includes('edit')) return 'Update';
    if (a.includes('delete') || a.includes('remove')) return 'Delete';
    return l.action || l.type || 'Activity';
  };

  const getLogDate = (l) => {
    const raw = l.createdAt || l.date || l.timestamp;
    const d = raw ? new Date(raw) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };

  const getLogUser = (l) => l.userName || l.user || l.actorName || l.actor || '-';
  const getLogRole = (l) => l.role || l.actorRole || '-';
  const getLogEmail = (l) => l.targetEmail || l.email || l.actorEmail || '-';
  const getLogDetails = (l) => l.details || l.message || l.note || '-';

  const inDateRange = (d) => {
    if (!d) return true;
    if (fromDate) {
      const f = new Date(fromDate);
      f.setHours(0, 0, 0, 0);
      if (d < f) return false;
    }
    if (toDate) {
      const t = new Date(toDate);
      t.setHours(23, 59, 59, 999);
      if (d > t) return false;
    }
    return true;
  };

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return logs.filter((l) => {
      const actionLabel = normalizeAction(l);
      const d = getLogDate(l);

      if (activityType !== 'All Activities') {
        if (actionLabel.toLowerCase() !== activityType.toLowerCase()) return false;
      }

      if (!inDateRange(d)) return false;

      if (!q) return true;

      const haystack = [
        actionLabel,
        getLogUser(l),
        getLogRole(l),
        getLogEmail(l),
        getLogDetails(l),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [logs, search, activityType, fromDate, toDate]);

  const totalLogins = useMemo(
    () => filteredLogs.filter((l) => normalizeAction(l) === 'Login').length,
    [filteredLogs]
  );

  const totalRegistrations = useMemo(
    () => filteredLogs.filter((l) => normalizeAction(l) === 'Registration').length,
    [filteredLogs]
  );

  const clearFilters = () => {
    setActivityType('All Activities');
    setFromDate('');
    setToDate('');
  };

  const toggleActive = async (user) => {
    try {
      await axios.put(`http://localhost:8000/api/admin/users/${user._id}/status`, {
        active: !user.active,
        ...actorPayload,
        details: `Admin changed status of ${user.email} to ${!user.active ? 'Active' : 'Inactive'}`,
      });

      const latestUsers = await fetchUsers();
      await fetchLogs();

      if (showViewModal && viewUser?._id === user._id) {
        const updated = latestUsers.find((x) => x._id === user._id);
        if (updated) setViewUser(updated);
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to update status.');
    }
  };

  const startEdit = (user) => {
    setEditingId(user._id);
    setEditDraft({
      fname: user.fname || '',
      lname: user.lname || '',
      email: user.email || '',
      number: user.number || '',
      username: user.username || '',
      role: user.role || '',
    });
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditDraft({ fname: '', lname: '', email: '', number: '', username: '', role: '' });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    if (!editDraft.fname.trim() || !editDraft.lname.trim()) {
      alert('First Name and Last Name are required.');
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(editDraft.email.trim())) {
      alert('Please enter a valid email.');
      return;
    }

    try {
      await axios.put(`http://localhost:8000/api/admin/users/${editingId}`, {
        fname: editDraft.fname.trim(),
        lname: editDraft.lname.trim(),
        email: editDraft.email.trim(),
        number: editDraft.number.trim(),
        username: editDraft.username.trim(),
        ...actorPayload,
        details: `Admin updated account fields for userId=${editingId}`,
      });

      cancelEdit();
      const latestUsers = await fetchUsers();
      await fetchLogs();
      return latestUsers;
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to update user.');
      return null;
    }
  };

  const deleteUser = async (user) => {
    const ok = window.confirm(`Delete account for ${user.email}? This cannot be undone.`);
    if (!ok) return;

    try {
      await axios.delete(`http://localhost:8000/api/admin/users/${user._id}`, {
        data: {
          ...actorPayload,
          details: `Admin deleted account for ${user.email}`,
        },
      });

      if (showViewModal && viewUser?._id === user._id) {
        closeViewModal();
      }

      await fetchUsers();
      await fetchLogs();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to delete user.');
    }
  };

  const validateCreate = () => {
    const d = createDraft;

    const fname = d.fname.trim();
    const lname = d.lname.trim();
    const email = d.email.trim().toLowerCase();
    const username = d.username.trim();
    const number = d.number.trim();
    const dob = d.dob;
    const gender = d.gender;
    const tempPassword = d.tempPassword;

    if (!fname || !lname) return 'First name and last name are required.';

    const nameRegex = /^[A-Za-z]+(?:[ \-'][A-Za-z]+)*$/;
    if (!nameRegex.test(fname)) return "First name must be letters only (spaces, hyphen '-', apostrophe ' allowed).";
    if (!nameRegex.test(lname)) return "Last name must be letters only (spaces, hyphen '-', apostrophe ' allowed).";

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) return 'Please enter a valid email.';

    if (!username) return 'Username is required.';

    if (!number) return 'Number is required.';
    if (!/^\d+$/.test(number)) return 'Phone number must contain numbers only.';
    if (number.length !== 11) return 'Phone number must be exactly 11 digits.';

    if (!dob) return 'Birthday is required.';
    if (!gender) return 'Gender is required.';

    if (!tempPassword || tempPassword.length < 8) return 'Temporary password must be at least 8 characters.';

    return null;
  };

  const handleCreateInstructor = async () => {
    const err = validateCreate();
    if (err) return alert(err);

    try {
      setCreating(true);

      await axios.post('http://localhost:8000/api/admin/instructors', {
        fname: createDraft.fname.trim(),
        lname: createDraft.lname.trim(),
        email: createDraft.email.trim().toLowerCase(),
        number: createDraft.number.trim(),
        username: createDraft.username.trim(),
        dob: createDraft.dob,
        gender: createDraft.gender,
        tempPassword: createDraft.tempPassword,
        ...actorPayload,
        details: `Admin created instructor account for ${createDraft.email.trim().toLowerCase()}`,
      });

      alert('Instructor account created!');

      setCreateDraft({
        fname: '',
        lname: '',
        email: '',
        number: '',
        username: '',
        dob: '',
        gender: 'Male',
        tempPassword: '',
      });

      setShowCreateModal(false);

      await fetchUsers();
      await fetchLogs();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || 'Failed to create instructor.');
    } finally {
      setCreating(false);
    }
  };

  const openViewModal = (u) => {
    setViewUser(u);
    setViewEditMode(false);

    setEditingId('');
    setEditDraft({
      fname: u.fname || '',
      lname: u.lname || '',
      email: u.email || '',
      number: u.number || '',
      username: u.username || '',
      role: u.role || '',
    });

    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewUser(null);
    setViewEditMode(false);
    cancelEdit();
  };

  const onViewClickUpdate = () => {
    if (!viewUser) return;
    setViewEditMode(true);
    startEdit(viewUser);
  };

  const onViewSave = async () => {
    const latestUsers = await saveEdit();
    setViewEditMode(false);

    if (latestUsers && editingId) {
      const updated = latestUsers.find((x) => x._id === editingId);
      if (updated) setViewUser(updated);
    }
  };

  const paginate = (items, page, pageSize) => {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return {
      page: safePage,
      total,
      totalPages,
      slice: items.slice(start, end),
      shown: Math.min(safePage * pageSize, total),
    };
  };

  const usersPg = useMemo(
    () => paginate(filteredUsers, usersPage, USERS_PAGE_SIZE),
    [filteredUsers, usersPage]
  );

  const logsPg = useMemo(
    () => paginate(filteredLogs, logsPage, LOGS_PAGE_SIZE),
    [filteredLogs, logsPage]
  );

  const PaginationBar = ({ page, totalPages, total, shown, onPrev, onNext }) => {
    if (total <= 0) return null;
    return (
      <div className="adPager">
        <div className="adPagerText">
          Showing <b>{shown}</b> of <b>{total}</b> results
        </div>

        <div className="adPagerBtns">
          <button
            type="button"
            className="adPagerBtn"
            onClick={onPrev}
            disabled={page <= 1}
            aria-label="Previous"
            title="Previous"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="adPagerBtn"
            onClick={onNext}
            disabled={page >= totalPages}
            aria-label="Next"
            title="Next"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="adminCard">
      <div className="adminCardHead">
        <div className="adminTitle">Dashboard</div>
        <div className="adminSub">Content placeholder</div>
      </div>
    </div>
  );

  const renderInstitution = () => (
    <div className="adminCard">
      <div className="adminCardHead">
        <div className="adminTitle">Institution Management</div>
        <div className="adminSub">Content placeholder</div>
      </div>
    </div>
  );

  const renderDataset = () => (
    <div className="adminCard">
      <div className="adminCardHead">
        <div className="adminTitle">Dataset Management</div>
        <div className="adminSub">Content placeholder</div>
      </div>
    </div>
  );

  const renderAccountManagement = () => (
    <>
      <div className="adminTop">
        <div className="adminTopLeft">
          <div className="adminTitle">Account Management</div>
          <div className="adminSub">
            Activate, deactivate, update, or delete administrative and instructor accounts.
          </div>
        </div>

        <div className="adminTopRight">
          <div className="adInnerSearch">
            <span className="adInnerSearchIcon">⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
            />
          </div>

          <button
            type="button"
            className="adPrimaryBtn"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Instructor Account
          </button>
        </div>
      </div>

      {loadingUsers ? (
        <p style={{ marginTop: 12 }}>Loading users...</p>
      ) : (
        <>
          <div className="adTableWrap">
            <table className="adTable">
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Role</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {usersPg.slice.map((u) => (
                  <tr key={u._id}>
                    <td style={td}>{`${u.fname || ''} ${u.lname || ''}`}</td>
                    <td style={td}>{u.email}</td>
                    <td style={td}>{u.role || 'user'}</td>
                    <td style={td}>
                      <span className={`adStatus ${u.active ? 'on' : 'off'}`}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td style={{ ...td, textAlign: 'right' }}>
                      <div className="adActionRow">
                        <button
                          type="button"
                          className="adIconBtn"
                          title="View"
                          onClick={() => openViewModal(u)}
                        >
                          <EyeIcon />
                        </button>

                        <button
                          type="button"
                          className="adIconBtn danger"
                          title="Delete"
                          onClick={() => deleteUser(u)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {usersPg.total === 0 && (
                  <tr>
                    <td style={td} colSpan={5}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={usersPg.page}
            totalPages={usersPg.totalPages}
            total={usersPg.total}
            shown={usersPg.shown}
            onPrev={() => setUsersPage((p) => Math.max(1, p - 1))}
            onNext={() => setUsersPage((p) => Math.min(usersPg.totalPages, p + 1))}
          />
        </>
      )}
    </>
  );

  const renderAuditLogs = () => (
    <>
      <div className="auditTop">
        <div className="auditTopRow">
          <div>
            <div className="adminTitle">Audit Logs</div>
            <div className="adminSub">Track user activities, logins, and registrations</div>
          </div>

          <div className="adInnerSearch">
            <span className="adInnerSearchIcon">⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
            />
          </div>
        </div>
      </div>

      <div className="auditFilters">
        <div className="auditField">
          <label>Activity Type</label>
          <select value={activityType} onChange={(e) => setActivityType(e.target.value)}>
            <option>All Activities</option>
            <option>Login</option>
            <option>Registration</option>
            <option>Create Instructor</option>
            <option>Status Change</option>
            <option>Update</option>
            <option>Delete</option>
          </select>
        </div>

        <div className="auditField">
          <label>From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div className="auditField">
          <label>To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <button type="button" className="auditClearBtn" onClick={clearFilters}>
          Clear Filters
        </button>
      </div>

      <div className="auditStats">
        <div className="auditStatCard">
          <div className="auditStatNum">{totalLogins}</div>
          <div className="auditStatLabel">Total Logins</div>
        </div>

        <div className="auditStatCard">
          <div className="auditStatNum">{totalRegistrations}</div>
          <div className="auditStatLabel">Registrations</div>
        </div>
      </div>

      {loadingLogs ? (
        <p style={{ marginTop: 10 }}>Loading logs...</p>
      ) : (
        <>
          <div className="adTableWrap">
            <table className="adTable">
              <thead>
                <tr>
                  <th style={th}>Date & Time</th>
                  <th style={th}>Activity</th>
                  <th style={th}>User</th>
                  <th style={th}>Role</th>
                  <th style={th}>Email</th>
                  <th style={th}>Details</th>
                </tr>
              </thead>

              <tbody>
                {logsPg.slice.map((l) => {
                  const d = getLogDate(l);
                  const actionLabel = normalizeAction(l);

                  return (
                    <tr key={l._id}>
                      <td style={td}>{d ? d.toLocaleString() : '-'}</td>
                      <td style={td}>{actionLabel}</td>
                      <td style={td}>{getLogUser(l)}</td>
                      <td style={td}>{getLogRole(l)}</td>
                      <td style={td}>{getLogEmail(l)}</td>
                      <td style={td}>{getLogDetails(l)}</td>
                    </tr>
                  );
                })}

                {logsPg.total === 0 && (
                  <tr>
                    <td style={td} colSpan={6}>
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={logsPg.page}
            totalPages={logsPg.totalPages}
            total={logsPg.total}
            shown={logsPg.shown}
            onPrev={() => setLogsPage((p) => Math.max(1, p - 1))}
            onNext={() => setLogsPage((p) => Math.min(logsPg.totalPages, p + 1))}
          />
        </>
      )}
    </>
  );

  const renderMain = () => {
    if (active === 'Dashboard') return renderDashboard();
    if (active === 'Institution Management') return renderInstitution();
    if (active === 'Dataset Management') return renderDataset();
    if (active === 'Account Management') return renderAccountManagement();
    if (active === 'Audit Logs') return renderAuditLogs();
    return renderDashboard();
  };

  return (
    <div className={`adWrap ${sideOpen ? '' : 'collapsed'}`}>
      <aside className="adSide">
        <div className="adSideTop">
          <div className="adLogoRow">
            <div className="adLogo">MyphoLens</div>

            <button
              type="button"
              className="adCollapseBtn"
              onClick={() => setSideOpen((p) => !p)}
              title={sideOpen ? 'Collapse menu' : 'Expand menu'}
            >
              {sideOpen ? '❮' : '❯'}
            </button>
          </div>

          <div className="adSectionTitle">ADMIN</div>

          <div className="adNav">
            <button
              type="button"
              className={`adNavBtn ${active === 'Dashboard' ? 'active' : ''}`}
              onClick={() => handleNav('Dashboard')}
              title="Dashboard"
            >
              <span className="adNavIcon"><DashIcon /></span>
              <span className="adNavText">Dashboard</span>
            </button>

            <button
              type="button"
              className={`adNavBtn ${active === 'Institution Management' ? 'active' : ''}`}
              onClick={() => handleNav('Institution Management')}
              title="Institution Management"
            >
              <span className="adNavIcon"><SchoolIcon /></span>
              <span className="adNavText">Institution Management</span>
            </button>

            <button
              type="button"
              className={`adNavBtn ${active === 'Account Management' ? 'active' : ''}`}
              onClick={() => handleNav('Account Management')}
              title="Account Management"
            >
              <span className="adNavIcon"><UsersIcon /></span>
              <span className="adNavText">Account Management</span>
            </button>

            <button
              type="button"
              className={`adNavBtn ${active === 'Dataset Management' ? 'active' : ''}`}
              onClick={() => handleNav('Dataset Management')}
              title="Dataset Management"
            >
              <span className="adNavIcon"><DatasetIcon /></span>
              <span className="adNavText">Dataset Management</span>
            </button>

            <button
              type="button"
              className={`adNavBtn ${active === 'Audit Logs' ? 'active' : ''}`}
              onClick={() => handleNav('Audit Logs')}
              title="Audit Logs"
            >
              <span className="adNavIcon"><LogsIcon /></span>
              <span className="adNavText">Audit Logs</span>
            </button>
          </div>
        </div>

        <div className="adSideBottom">
          <button type="button" className="adLogout" onClick={handleLogout} title="Logout">
            <span className="adNavIcon" style={{ display: 'grid', placeItems: 'center' }}><LogoutIcon /></span>
            <span className="adNavText">LOGOUT</span>
          </button>
        </div>
      </aside>

      <section className="adMain">
        <header className="adTopbar">
          <div />
          <div className="adTopRight">
            <div className="adAvatar" title="Admin">A</div>
          </div>
        </header>

        <div className="adContent">{renderMain()}</div>
      </section>

      {showCreateModal && (
        <div className="adModalOverlay" onClick={() => !creating && setShowCreateModal(false)}>
          <div className="adModalCard" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="adModalClose"
              onClick={() => !creating && setShowCreateModal(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="adModalHead">
              <div className="adModalTitle">Create Instructor Account</div>
              <div className="adModalSub">Fill in the details below.</div>
            </div>

            <div className="adFormGrid">
              <div className="adField">
                <label>First Name</label>
                <input
                  style={miniInputFullWide}
                  placeholder="First name"
                  value={createDraft.fname}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, fname: sanitizeName(e.target.value) }))}
                />
              </div>

              <div className="adField">
                <label>Last Name</label>
                <input
                  style={miniInputFullWide}
                  placeholder="Last name"
                  value={createDraft.lname}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, lname: sanitizeName(e.target.value) }))}
                />
              </div>

              <div className="adField">
                <label>Email</label>
                <input
                  style={miniInputFullWide}
                  placeholder="Email"
                  value={createDraft.email}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="adField">
                <label>Phone Number</label>
                <input
                  style={miniInputFullWide}
                  type="text"
                  inputMode="numeric"
                  placeholder="11 digits"
                  value={createDraft.number}
                  maxLength={11}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, number: sanitizePhone(e.target.value) }))}
                />
              </div>

              <div className="adField">
                <label>Username</label>
                <input
                  style={miniInputFullWide}
                  placeholder="Username"
                  value={createDraft.username}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, username: e.target.value }))}
                />
              </div>

              <div className="adField">
                <label>Birth Date</label>
                <input
                  style={miniInputFullWide}
                  type="date"
                  value={createDraft.dob}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, dob: e.target.value }))}
                />
              </div>

              <div className="adField">
                <label>Gender</label>
                <select
                  style={miniInputFullWide}
                  value={createDraft.gender}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, gender: e.target.value }))}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </div>

              <div className="adField">
                <label>Temporary Password</label>
                <input
                  style={miniInputFullWide}
                  placeholder="Temporary Password"
                  type="password"
                  value={createDraft.tempPassword}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, tempPassword: e.target.value }))}
                />
              </div>
            </div>

            <div className="adModalActions">
              <button
                type="button"
                className="adGhostBtn"
                onClick={() => !creating && setShowCreateModal(false)}
                disabled={creating}
              >
                Cancel
              </button>

              <button
                type="button"
                className="adPrimaryBtn"
                onClick={handleCreateInstructor}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Instructor Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && viewUser && (
        <div className="adModalOverlay" onClick={closeViewModal}>
          <div className="adModalCard" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="adModalClose" onClick={closeViewModal} aria-label="Close">
              ✕
            </button>

            <div className="adModalHead">
              <div className="adModalTitle">Account Details</div>
              <div className="adModalSub">{viewUser.email}</div>
            </div>

            <div className="adViewGrid">
              <div className="adField">
                <label>First Name</label>
                <input
                  style={miniInputFullWide}
                  value={editDraft.fname}
                  onChange={(e) => setEditDraft((p) => ({ ...p, fname: sanitizeName(e.target.value) }))}
                  disabled={!viewEditMode}
                />
              </div>

              <div className="adField">
                <label>Last Name</label>
                <input
                  style={miniInputFullWide}
                  value={editDraft.lname}
                  onChange={(e) => setEditDraft((p) => ({ ...p, lname: sanitizeName(e.target.value) }))}
                  disabled={!viewEditMode}
                />
              </div>

              <div className="adField">
                <label>Email</label>
                <input
                  style={miniInputFullWide}
                  value={editDraft.email}
                  onChange={(e) => setEditDraft((p) => ({ ...p, email: e.target.value }))}
                  disabled={!viewEditMode}
                />
              </div>

              <div className="adField">
                <label>Phone Number</label>
                <input
                  style={miniInputFullWide}
                  value={editDraft.number}
                  onChange={(e) => setEditDraft((p) => ({ ...p, number: sanitizePhone(e.target.value) }))}
                  disabled={!viewEditMode}
                />
              </div>

              <div className="adField">
                <label>Username</label>
                <input
                  style={miniInputFullWide}
                  value={editDraft.username}
                  onChange={(e) => setEditDraft((p) => ({ ...p, username: e.target.value }))}
                  disabled={!viewEditMode}
                />
              </div>

              <div className="adField">
                <label>Role</label>
                <input style={miniInputFullWide} value={viewUser.role || 'user'} disabled />
              </div>

              <div className="adField">
                <label>Status</label>
                <div style={{ marginTop: 6 }}>
                  <span className={`adStatus ${viewUser.active ? 'on' : 'off'}`}>
                    {viewUser.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="adModalActions">
              <button
                type="button"
                className="adGhostBtn"
                onClick={() => toggleActive(viewUser)}
              >
                {viewUser.active ? 'Deactivate' : 'Activate'}
              </button>

              {!viewEditMode ? (
                <button type="button" className="adPrimaryBtn" onClick={onViewClickUpdate}>
                  Update
                </button>
              ) : (
                <>
                  <button type="button" className="adGhostBtn" onClick={() => setViewEditMode(false)}>
                    Cancel
                  </button>
                  <button type="button" className="adPrimaryBtn" onClick={onViewSave}>
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th = {
  textAlign: 'left',
  padding: '12px 10px',
  borderBottom: '1px solid rgba(0,0,0,0.08)',
  fontWeight: 900,
  fontSize: 12,
  letterSpacing: 0.4,
  color: 'rgba(0,0,0,0.55)',
  textTransform: 'uppercase',
};

const td = {
  padding: '12px 10px',
  borderBottom: '1px solid rgba(0,0,0,0.06)',
  verticalAlign: 'middle',
  fontSize: 13,
  fontWeight: 700,
  color: 'rgba(0,0,0,0.78)',
};

const miniInputFullWide = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.12)',
  outline: 'none',
  background: 'rgba(255,255,255,0.98)',
};

//ICONS
function DashIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 13h8V4H4v9Zm0 7h8v-5H4v5Zm10 0h6V11h-6v9Zm0-18v7h6V2h-6Z" fill="currentColor" /></svg>);}
function SchoolIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3Zm-7.2 7L12 13.7 19.2 10 12 6.3 4.8 10ZM6 12.85V17c0 2.21 3.13 4 6 4s6-1.79 6-4v-4.15l-6 3.27-6-3.27Z" fill="currentColor" /></svg>);}
function UsersIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3ZM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h7v-2.5c0-2.33-4.67-3.5-7-3.5Z" fill="currentColor" /></svg>);}
function DatasetIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 6c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v12c0 1.1-.9 2-2 2H6a2 2 0 0 1-2-2V6Zm2 0v12h12V6H6Zm2 2h8v2H8V8Zm0 4h8v2H8v-2Z" fill="currentColor" /></svg>);}
function LogsIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 3h18v2H3V3Zm0 6h18v2H3V9Zm0 6h12v2H3v-2Zm0 6h12v2H3v-2Z" fill="currentColor" /></svg>);}
function LogoutIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10 17v-2h4v-2h-4v-2l-3 3 3 3Zm-6 4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8v2H4v14h8v2H4Zm12-16h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4v-2h4V7h-4V5Z" fill="currentColor" /></svg>);}
function EyeIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" fill="currentColor" /></svg>);}
function TrashIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 7h12l-1 14H7L6 7Zm3-3h6l1 2H8l1-2Z" fill="currentColor" /></svg>);}
function ChevronLeft() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>);}
function ChevronRight() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>);}

export default Admin;
