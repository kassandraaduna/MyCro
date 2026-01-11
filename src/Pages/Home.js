import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function HomePage() {
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        alert(`Searching for: ${search}`);
    }

    const handleLogout = () => {
        navigate('/Login'); 
    }

    return (
        <div className="homeBody">
            <header className="homeHeader">
                <div className="logo">
                    <h2>MyCro</h2>
                </div>

                <form className="searchForm" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button type="submit">🔍</button>
                </form>

                <nav className="navButtons">
                    <button>Home</button>
                    <button>Lessons</button>
                    <button>Progress</button>
                    <button>Profile</button>
                    <button className="logoutBtn" onClick={handleLogout}>Logout</button>
                </nav>
            </header>

            <main className="homeMain">
                <h1>Welcome mga cute!</h1>
                <p>blahblahblahblahblah</p>
            </main>
        </div>
    );
}

export default HomePage;
