import React from 'react';
import '../../style/AboutUs.css'; // Adjust the path based on your project structure

const AboutUs = () => {
  return (
    <div className="about-us-container">
      <h1>About City Group of Schools Ogidi/Umuoji</h1>
      <p>
        <strong>City Group of Schools Ogidi/Umuoji</strong> is a leading educational institution with three vibrant campuses, dedicated to nurturing excellence, character, and innovation in every learner. Our legacy is built on a passion for academic distinction and holistic development, empowering students to become leaders of tomorrow.
      </p>
      <h2>Our Vision</h2>
      <p>
        To be the most sought-after citadel of learning in Nigeria, producing globally competitive graduates who are equipped with knowledge, skills, and values to transform their communities and the world.
      </p>
      <h2>Our Mission</h2>
      <p>
        To provide a world-class, technology-driven, and value-based education that inspires creativity, critical thinking, and lifelong learning. We are committed to fostering a safe, inclusive, and dynamic environment where every child can discover and maximize their unique potential.
      </p>
      <h2>Our Accomplishments</h2>
      <ul>
        <li>Consistent record of outstanding performance in national and international examinations</li>
        <li>State-of-the-art facilities across all three campuses</li>
        <li>Innovative integration of ICT and modern teaching methodologies</li>
        <li>Numerous awards in academics, sports, and cultural competitions</li>
        <li>Alumni excelling in top universities and professional fields worldwide</li>
      </ul>
      <h2>Contact Us</h2>
      <p>
        For admissions, partnership, or further information, please reach out to us at:
        <br />
        <a href="mailto:info@citygroupschools.com">info@citygroupschools.com</a>
      </p>
    </div>
  );
};

export default AboutUs;
