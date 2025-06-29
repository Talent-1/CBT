// cbt-frontend/src/pages/RegisterPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../api/auth';
import { getBranches } from '../api/admin'; // This will now call the public endpoint

function RegisterPage() {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        gender: '',
        role: 'student', // Default role set to student
        branchId: '',
        section: '', // Junior/Senior
        classLevel: '', // JSS1, SS1, Primary 1 etc.
        areaOfSpecialization: '', // NEW: For Senior students (Sciences, Arts, Commercial)
        // profilePictureUrl: '', // Add this if you have an input for it
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(true);
    const navigate = useNavigate();

    // Determine if the current class level is a Senior Secondary class
    const isSeniorStudentClass = (classLevel) => {
        return ['SS1', 'SS2', 'SS3'].includes(classLevel);
    };

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                console.log("Attempting to fetch branches for registration...");
                const data = await getBranches(); // This now calls the public endpoint
                setBranches(data);
                if (data.length > 0) {
                    // Set default branch to the first available one if not already set
                    if (!formData.branchId) {
                        setFormData(prev => ({ ...prev, branchId: data[0]._id }));
                    }
                } else {
                    setError('No branches available. Please contact support.');
                }
                console.log("Branches fetched successfully:", data);
            } catch (err) {
                console.error('Error fetching branches in RegisterPage:', err);
                setError(err.message || 'Failed to load branches. Please try again later.');
            } finally {
                setLoadingBranches(false);
            }
        };
        fetchBranches();
    }, []); // Empty dependency array means this runs once on mount

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };

        setError(''); // Clear error on any input change
        setSuccess(''); // Clear success on any input change

        // Logic to clear/set conditional fields
        if (name === 'role') {
            if (value === 'student') {
                // When changing to student, clear teacher-specific fields
                newFormData.email = ''; // Email cleared for all students initially
                newFormData.areaOfSpecialization = ''; // Clear specialization
            } else if (value === 'teacher') {
                // When changing to teacher, clear student-specific fields
                newFormData.section = '';
                newFormData.classLevel = '';
                newFormData.areaOfSpecialization = ''; // Teachers also don't use this field.
            }
        } else if (name === 'section' && newFormData.role === 'student') {
            if (value === 'Junior') {
                newFormData.email = ''; // Junior students don't use email
                newFormData.areaOfSpecialization = ''; // Junior students don't have specialization
            }
            // If section becomes 'Senior', email and specialization might become relevant based on classLevel
        } else if (name === 'classLevel' && newFormData.role === 'student') {
            // If a student's class level changes, re-evaluate email and specialization
            if (!isSeniorStudentClass(value)) { // If it's not an SS class
                newFormData.email = ''; // Clear email for JSS/Primary
                newFormData.areaOfSpecialization = ''; // Clear specialization for JSS/Primary
            }
            // If it IS an SS class, email/specialization become conditionally required by the form itself
        }

        setFormData(newFormData);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear any previous error messages
        setSuccess(''); // Clear success message on new submission

        // --- Frontend Validation ---
        if (!formData.fullName || !formData.password || !formData.gender || !formData.role || !formData.branchId) {
            return setError('Please fill in all required fields: Full Name, Password, Gender, Role, and Branch.');
        }

        // Prepare Base Payload
        const payload = {
            fullName: formData.fullName,
            password: formData.password,
            gender: formData.gender,
            role: formData.role,
            branchId: formData.branchId,
            // profilePictureUrl: formData.profilePictureUrl, // Include if you add an input for it
        };

        // --- Conditionally Add Fields based on Role & Section/ClassLevel ---
        if (formData.role === 'student') {
            if (!formData.section || !formData.classLevel) {
                return setError('Students must select a section and class level.');
            }
            payload.section = formData.section;
            payload.classLevel = formData.classLevel;

            // Email and Area of Specialization are for Senior students (SS1, SS2, SS3)
            if (isSeniorStudentClass(formData.classLevel)) {
                if (!formData.email) {
                    return setError('Senior secondary students (SS1-SS3) must provide an email.');
                }
                payload.email = formData.email;

                if (!formData.areaOfSpecialization) {
                    return setError('Senior secondary students (SS1-SS3) must select an area of specialization (Sciences, Arts, or Commercial).');
                }
                payload.areaOfSpecialization = formData.areaOfSpecialization;
            }
        } else if (formData.role === 'teacher') {
            if (!formData.email) {
                return setError('Teachers must provide an email.');
            }
            payload.email = formData.email;

            if (!formData.areaOfSpecialization) {
                return setError('Teachers must provide an area of specialization.');
            }
            payload.areaOfSpecialization = formData.areaOfSpecialization;
        }
        // --- End Conditional Payload Building ---

        console.log('Sending final registration payload:', payload); // Debug: See what's being sent

        try {
            const data = await registerUser(payload); // Call the API function

            console.log('Registration successful! Backend response:', data);
            setSuccess('Registration successful! You can now log in.');

            // Extract login ID - studentId is generated by backend, email for others
            const loginId = data.user.studentId || data.user.email; // Assuming studentId will be returned for students
            alert(`Registration successful! Your login ID is: ${loginId || data.user.fullName}. Please use this for login.`); // Fallback to fullName if no other ID

            // Clear form after successful submission
            setFormData({
                fullName: '',
                email: '',
                password: '',
                gender: '',
                role: 'student',
                branchId: branches.length > 0 ? branches[0]._id : '', // Reset to default or first branch
                section: '',
                classLevel: '',
                areaOfSpecialization: '',
                // profilePictureUrl: '',
            });

            navigate('/login'); // Redirect to login page on success
        } catch (err) {
            console.error("Registration error caught in component:", err);
            // Ensure you're displaying the correct error message from the backend
            setError(err.response?.data?.message || err.message || "An unknown error occurred during registration. Please try again.");
        }
    };

    if (loadingBranches) {
        return <p>Loading branches...</p>;
    }

    return (
        <div>
            <h1>Register New User</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="fullName">Full Name:</label>
                    <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="gender">Gender:</label>
                    <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange} required>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="branchId">Branch/Campus:</label>
                    <select id="branchId" name="branchId" value={formData.branchId} onChange={handleInputChange} required>
                        {branches.length === 0 ? (
                            <option value="">No branches available</option>
                        ) : (
                            <>
                                <option value="">Select Branch</option>
                                {branches.map(branch => (
                                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                                ))}
                            </>
                        )}
                    </select>
                </div>
                <div>
                    <label htmlFor="role">Role:</label>
                    <select id="role" name="role" value={formData.role} onChange={handleInputChange} required>
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        {/* Removed <option value="admin">Admin</option> as per previous discussion */}
                    </select>
                </div>

                {formData.role === 'student' && (
                    <>
                        <div>
                            <label htmlFor="section">Section:</label>
                            <select id="section" name="section" value={formData.section} onChange={handleInputChange} required>
                                <option value="">Select Section</option>
                                <option value="Junior">Junior</option>
                                <option value="Senior">Senior</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="classLevel">Class Level:</label>
                            <select id="classLevel" name="classLevel" value={formData.classLevel} onChange={handleInputChange} required>
                                <option value="">Select Class Level</option>
                                {formData.section === 'Junior' && (
                                    <>
                                        <option value="JSS1">JSS1</option>
                                        <option value="JSS2">JSS2</option>
                                        <option value="JSS3">JSS3</option>
                                        <option value="Primary 1">Primary 1</option>
                                        <option value="Primary 2">Primary 2</option>
                                        <option value="Primary 3">Primary 3</option>
                                        <option value="Primary 4">Primary 4</option>
                                        <option value="Primary 5">Primary 5</option>
                                        <option value="Primary 6">Primary 6</option>
                                    </>
                                )}
                                {formData.section === 'Senior' && (
                                    <>
                                        <option value="SS1">SS1</option>
                                        <option value="SS2">SS2</option>
                                        <option value="SS3">SS3</option>
                                    </>
                                )}
                            </select>
                        </div>
                        {/* NEW: Area of Specialization for Senior Students (SS1, SS2, SS3) */}
                        {isSeniorStudentClass(formData.classLevel) && (
                            <div>
                                <label htmlFor="areaOfSpecialization">Department/Area of Specialization:</label>
                                <select
                                    id="areaOfSpecialization"
                                    name="areaOfSpecialization"
                                    value={formData.areaOfSpecialization}
                                    onChange={handleInputChange}
                                    required // This becomes required if it's an SS class
                                >
                                    <option value="">Select Department</option>
                                    <option value="Sciences">Sciences</option>
                                    <option value="Arts">Arts</option>
                                    <option value="Commercial">Commercial</option>
                                </select>
                            </div>
                        )}
                    </>
                )}

                {/* Email field is conditionally rendered and conditionally required */}
                {((formData.role === 'teacher') || (formData.role === 'student' && isSeniorStudentClass(formData.classLevel))) && (
                    <div>
                        <label htmlFor="email">Email:</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required={formData.role === 'teacher' || isSeniorStudentClass(formData.classLevel)}
                        />
                    </div>
                )}

                {formData.role === 'teacher' && (
                    <div>
                        <label htmlFor="areaOfSpecialization">Area of Specialization (Teacher):</label>
                        {/* Teachers can have their own specialization, which is a free text field,
                            distinct from student departments. */}
                        <input
                            type="text"
                            id="areaOfSpecialization"
                            name="areaOfSpecialization"
                            value={formData.areaOfSpecialization}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                )}

                {error && <p style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}
                {success && <p style={{ color: 'green', marginTop: '10px' }}>Success: {success}</p>}

                <button type="submit">Register</button>
            </form>
            <p>Already have an account? <Link to="/login">Login here</Link></p>
        </div>
    );
}

export default RegisterPage;
