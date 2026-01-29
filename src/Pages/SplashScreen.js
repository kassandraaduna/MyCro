import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SplashScreen.css';

function SplashScreen() {

    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/Landing'); 
        }, 2500); 

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="splashBody">
            <div className="splashContent">
                <h1 className="splashTitle">MyphoLens</h1>
                <p className="splashSub">Loading...</p>
            </div>
        </div>
    );
}

export default SplashScreen;
