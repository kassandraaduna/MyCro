import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="lpBody">
      <header className="lpHeader">
        <div className="lpBrand" onClick={() => navigate('/')} role="button" tabIndex={0}>
          <span className="lpBrandText">MyphoLens</span>
        </div>

        <div className="lpSearchWrap">
          <span className="lpSearchIcon">⌕</span>
          <input
            className="lpSearch"
            type="text"
            placeholder="Search Mycology Topics"
          />
        </div>

        <div className="lpTopActions">
          <button
            type="button"
            className="lpLinkBtn"
            onClick={() => navigate('/Login')}
          >
            SIGN IN
          </button>

          <button
            type="button"
            className="lpOutlineBtn"
            onClick={() => navigate('/Register')}
          >
            SIGN UP
          </button>
        </div>
      </header>

      <main className="lpMain">
        <section className="lpHero">
          <div className="lpLeft">
            <h1 className="lpTitle">HEADLINE ABOUT MYPHOLENS</h1>
            <p className="lpSub">SUBTITLE OR TAGLINE ABOUT MYPHOLENS</p>

            <button
              type="button"
              className="lpCta"
              onClick={() => navigate('/Login')}
            >
              GET STARTED
            </button>
          </div>

          <div className="lpRight">
            <div className="lpArtStack">
              <div className="lpArt lpArtBig" />
              <div className="lpArt lpArtMid" />
              <div className="lpArt lpArtSmall" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
