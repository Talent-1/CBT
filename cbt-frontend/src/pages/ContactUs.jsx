import React, { useState } from 'react';
import '../style/ContactUs.css'; // Adjust the path based on your project structure

const ContactUs = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would send the form data to your backend or email service
    setSubmitted(true);
  };

  return (
    <div className="contact-us-container">
      <h1>Contact Us</h1>
      <p>
        We would love to hear from you! Reach out to City Group of Schools Ogidi/Umuoji for admissions, inquiries, or partnership opportunities.
      </p>
      <div className="contact-details">
        <p><strong>Email:</strong> <a href="mailto:info@citygroupschools.com">info@citygroupschools.com</a></p>
        <p><strong>Phone:</strong> <a href="tel:08135015436">08135015436</a></p>
      </div>
      <div className="social-media-section">
        <h2>Connect with us:</h2>
        <div className="social-icons">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="icon facebook">
            <i className="fab fa-facebook-f"></i>
          </a>
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="icon x">
            <i className="fab fa-x-twitter"></i>
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="icon instagram">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="icon tiktok">
            <i className="fab fa-tiktok"></i>
          </a>
          <a href="https://wa.me/2348135015436" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="icon whatsapp">
            <i className="fab fa-whatsapp"></i>
          </a>
        </div>
      </div>
      <div className="contact-form-section">
        <h2>Send Us a Message</h2>
        {submitted ? (
          <div className="form-success">Thank you for contacting us! We will get back to you soon.</div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input type="text" id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" value={form.message} onChange={handleChange} required rows={5}></textarea>
            </div>
            <button type="submit" className="submit-btn">Send Message</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ContactUs;
