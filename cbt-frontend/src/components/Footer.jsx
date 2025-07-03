// cbt-frontend/src/components/Footer.jsx
import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section social-links">
          <h3>Connect With Us</h3>
          <ul className="footer-social-icons">
            <li>
              <a href="mailto:info@citygroupschools.com" target="_blank" rel="noopener noreferrer" aria-label="Email">
                <i className="fas fa-envelope"></i>
              </a>
            </li>
            <li>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
            </li>
            <li>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
                <i className="fab fa-x-twitter"></i>
              </a>
            </li>
            <li>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
            </li>
            <li>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <i className="fab fa-tiktok"></i>
              </a>
            </li>
            <li>
              <a href="https://wa.me/2348135015436" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <i className="fab fa-whatsapp"></i>
              </a>
            </li>
          </ul>
        </div>
        <div className="footer-section school-addresses">
          <h3>School Addresses</h3>
          <p><strong>Head Campus:</strong> Gen. Hospital, Abor Ogidi.</p>
          <p><strong>Umuoji Campus:</strong> Urudeke/Ifite Rd, Umuoji</p>
          <p><strong>Adazi Ogidi Campus:</strong> Behind St. John's Cath. Church Adazi Ogidi.</p>
        </div>
        <div className="footer-section powered-by">
          <p>Powered by</p>
          <a href="https://talenttechhub.com" target="_blank" rel="noopener noreferrer">
            <img src="/talent-tech-hub.png" alt="Talent Tech Hub Logo" className="company-logo" />
          </a>
          <p>Talent Tech Hub &copy; {currentYear}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;