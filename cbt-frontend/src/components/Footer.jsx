// cbt-frontend/src/components/Footer.jsx
import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section social-links">
          <h3>Connect With Us</h3>
          <ul>
            <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a></li>
            <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a></li>
            <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a></li>
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