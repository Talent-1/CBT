const mongoose = require('mongoose');
const colors = require('colors'); // Optional: for colored console output
const bcrypt = require('bcryptjs');

// Import your Mongoose Models
const Subject = require('./models/Subject');
const Branch = require('./models/Branch');
const User = require('./models/User');

// --- NEW: Import your connectDB function from db.js ---
const connectDatabase = require('./config/db'); // Renamed to avoid confusion with internal connectDB function

// --- REVISED: The connectDB function in seed.js now calls the imported connectDatabase ---
const connectDB = async () => {
    try {
        await connectDatabase(); // Call the connectDB function from backend/config/db.js
        // MongoDB Connected message will come from db.js itself
    } catch (error) {
        console.error(`Error in seed script connecting to DB: ${error.message}`.red.bold);
        process.exit(1); // Exit process with failure
    }
};

// --- Data to Seed ---

const subjectsToSeed = [ // <-- CORRECTED: Added '=' and opening '['
    // JSS1 Subjects
    { subjectName: 'Mathematics', classLevel: 'JSS1' },
    { subjectName: 'English Language', classLevel: 'JSS1' },
    { subjectName: 'Basic Science and Technology', classLevel: 'JSS1' },
    { subjectName: 'Pre-Vocational Studies', classLevel: 'JSS1' },
    { subjectName: 'Igbo Language', classLevel: 'JSS1' },
    { subjectName: 'Christian Religious Studies', classLevel: 'JSS1' },
    { subjectName: 'History', classLevel: 'JSS1' },
    { subjectName: 'Cultural and Creative Arts', classLevel: 'JSS1' },
    { subjectName: 'National Value Education', classLevel: 'JSS1' },
    { subjectName: 'Computer and PHE', classLevel: 'JSS1' },
    { subjectName: 'French', classLevel: 'JSS1' },
    { subjectName: 'Business Studies', classLevel: 'JSS1' },
    { subjectName: 'Skills Acquisition', classLevel: 'JSS1' },

    // JSS2 Subjects
    { subjectName: 'Mathematics', classLevel: 'JSS2' },
    { subjectName: 'English Language', classLevel: 'JSS2' },
    { subjectName: 'Basic Science and Technology', classLevel: 'JSS2' },
    { subjectName: 'Pre-Vocational Studies', classLevel: 'JSS2' },
    { subjectName: 'Igbo Language', classLevel: 'JSS2' },
    { subjectName: 'Christian Religious Studies', classLevel: 'JSS2' },
    { subjectName: 'History', classLevel: 'JSS2' },
    { subjectName: 'Cultural and Creative Arts', classLevel: 'JSS2' },
    { subjectName: 'Computer and PHE', classLevel: 'JSS2' }, // <-- CORRECTED typo here
    { subjectName: 'French', classLevel: 'JSS2' },
    { subjectName: 'Business Studies', classLevel: 'JSS2' },
    { subjectName: 'Skills Acquisition', classLevel: 'JSS2' },

    // JSS3 Subjects
    { subjectName: 'Mathematics', classLevel: 'JSS3' },
    { subjectName: 'English Language', classLevel: 'JSS3' },
    { subjectName: 'Basic Science and Technology', classLevel: 'JSS3' },
    { subjectName: 'Pre-Vocational Studies', classLevel: 'JSS3' },
    { subjectName: 'Igbo Language', classLevel: 'JSS3' },
    { subjectName: 'Christian Religious Studies', classLevel: 'JSS3' },
    { subjectName: 'History', classLevel: 'JSS3' },
    { subjectName: 'Cultural and Creative Arts', classLevel: 'JSS3' },
    { subjectName: 'National Value Education', classLevel: 'JSS3' },
    { subjectName: 'Computer and PHE', classLevel: 'JSS3' },
    { subjectName: 'French', classLevel: 'JSS3' },
    { subjectName: 'Business Studies', classLevel: 'JSS3' },
    { subjectName: 'Skills Acquisition', classLevel: 'JSS3' },

    // SS1 Subjects
    { subjectName: 'Mathematics', classLevel: 'SS1' },
    { subjectName: 'English Language', classLevel: 'SS1' },
    { subjectName: 'Physics', classLevel: 'SS1' },
    { subjectName: 'Chemistry', classLevel: 'SS1' },
    { subjectName: 'Biology', classLevel: 'SS1' },
    { subjectName: 'Igbo Language', classLevel: 'SS1' },
    { subjectName: 'Christian Religious Studies', classLevel: 'SS1' },
    { subjectName: 'Geography', classLevel: 'SS1' },
    { subjectName: 'Accounting', classLevel: 'SS1' }, // <-- CORRECTED typo here
    { subjectName: 'Agricultural Science', classLevel: 'SS1' },
    { subjectName: 'Animal Husbandry', classLevel: 'SS1' },
    { subjectName: 'Data Processing', classLevel: 'SS1' },
    { subjectName: 'Government', classLevel: 'SS1' },
    { subjectName: 'Commerce', classLevel: 'SS1' },
    { subjectName: 'Literature-in-English', classLevel: 'SS1' },
    { subjectName: 'Further Mathematics', classLevel: 'SS1' },
    { subjectName: 'Marketing', classLevel: 'SS1' },

    // SS2 Subjects
    { subjectName: 'Mathematics', classLevel: 'SS2' },
    { subjectName: 'English Language', classLevel: 'SS2' },
    { subjectName: 'Physics', classLevel: 'SS2' },
    { subjectName: 'Chemistry', classLevel: 'SS2' },
    { subjectName: 'Biology', classLevel: 'SS2' },
    { subjectName: 'Igbo Language', classLevel: 'SS2' },
    { subjectName: 'Christian Religious Studies', classLevel: 'SS2' },
    { subjectName: 'Geography', classLevel: 'SS2' },
    { subjectName: 'Economics', classLevel: 'SS2' },
    { subjectName: 'Accounting', classLevel: 'SS2' },
    { subjectName: 'Agricultural Science', classLevel: 'SS2' },
    { subjectName: 'Animal Husbandry', classLevel: 'SS2' },
    { subjectName: 'Data Processing', classLevel: 'SS2' },
    { subjectName: 'Government', classLevel: 'SS2' },
    { subjectName: 'Commerce', classLevel: 'SS2' },
    { subjectName: 'Literature-in-English', classLevel: 'SS2' },
    { subjectName: 'Further Mathematics', classLevel: 'SS2' },
    { subjectName: 'Marketing', classLevel: 'SS2' },

    // SS3 Subjects
    { subjectName: 'Mathematics', classLevel: 'SS3' },
    { subjectName: 'English Language', classLevel: 'SS3' },
    { subjectName: 'Physics', classLevel: 'SS3' },
    { subjectName: 'Chemistry', classLevel: 'SS3' },
    { subjectName: 'Biology', classLevel: 'SS3' },
    { subjectName: 'Igbo Language', classLevel: 'SS3' },
    { subjectName: 'Christian Religious Studies', classLevel: 'SS3' },
    { subjectName: 'Geography', classLevel: 'SS3' },
    { subjectName: 'Economics', classLevel: 'SS3' },
    { subjectName: 'Accounting', classLevel: 'SS3' },
    { subjectName: 'Agricultural Science', classLevel: 'SS3' },
    { subjectName: 'Animal Husbandry', classLevel: 'SS3' },
    { subjectName: 'Data Processing', classLevel: 'SS3' },
    { subjectName: 'Government', classLevel: 'SS3' },
    { subjectName: 'Commerce', classLevel: 'SS3' },
    { subjectName: 'Literature-in-English', classLevel: 'SS3' },
    { subjectName: 'Further Mathematics', classLevel: 'SS3' },
    { subjectName: 'Marketing', classLevel: 'SS3' },

    // Primary School Subjects
    { subjectName: 'English Studies', classLevel: 'Primary 1' },
    { subjectName: 'Mathematics', classLevel: 'Primary 1' },
    { subjectName: 'Basic Science', classLevel: 'Primary 1' },
    { subjectName: 'Quantitative Reasoning', classLevel: 'Primary 1' },
    { subjectName: 'Verbal Reasoning', classLevel: 'Primary 1' },
    { subjectName: 'Cultural and Creative Arts', classLevel: 'Primary 1' },
    { subjectName: 'Computer Studies', classLevel: 'Primary 1' },
    { subjectName: 'Agricultural Science', classLevel: 'Primary 1' },
    { subjectName: 'Social Studies', classLevel: 'Primary 1' },

    { subjectName: 'English Studies', classLevel: 'Primary 2' },
    { subjectName: 'Mathematics', classLevel: 'Primary 2' },
    { subjectName: 'Basic Science', classLevel: 'Primary 2' },
    { subjectName: 'Quantitative Reasoning', classLevel: 'Primary 2' },
    { subjectName: 'Verbal Reasoning', classLevel: 'Primary 2' },
    { subjectName: 'Cultural and Creative Arts', classLevel: 'Primary 2' },
    { subjectName: 'Computer Studies', classLevel: 'Primary 2' },
    { subjectName: 'Agricultural Science', classLevel: 'Primary 2' },
    { subjectName: 'Social Studies', classLevel: 'Primary 2' },

    { subjectName: 'English Studies', classLevel: 'Primary 3' },
    { subjectName: 'Mathematics', classLevel: 'Primary 3' },
    { subjectName: 'Basic Science', classLevel: 'Primary 3' },
    { subjectName: 'Quantitative Reasoning', classLevel: 'Primary 3' },
    { subjectName: 'Verbal Reasoning', classLevel: 'Primary 3' },
    { subjectName: 'Cultural and Creative Arts', classLevel: 'Primary 3' },
    { subjectName: 'Computer Studies', classLevel: 'Primary 3' },
    { subjectName: 'Agricultural Science', classLevel: 'Primary 3' },
    { subjectName: 'Social Studies', classLevel: 'Primary 3' },

    { subjectName: 'English Studies', classLevel: 'Primary 4' },
    { subjectName: 'Mathematics', classLevel: 'Primary 4' },
    { subjectName: 'Basic Science', classLevel: 'Primary 4' },
    { subjectName: 'Quantitative Reasoning', classLevel: 'Primary 4' },
    { subjectName: 'Verbal Reasoning', classLevel: 'Primary 4' },
    { subjectName: 'Cultural and Creative Arts', classLevel: 'Primary 4' },
    { subjectName: 'Computer Studies', classLevel: 'Primary 4' },
    { subjectName: 'Agricultural Science', classLevel: 'Primary 4' },
    { subjectName: 'Social Studies', classLevel: 'Primary 4' },

    { subjectName: 'English Studies', classLevel: 'Primary 5' },
    { subjectName: 'Mathematics', classLevel: 'Primary 5' },
    { subjectName: 'Basic Science', classLevel: 'Primary 5' },
    { subjectName: 'Quantitative Reasoning', classLevel: 'Primary 5' },
    { subjectName: 'Verbal Reasoning', classLevel: 'Primary 5' },
    { subjectName: 'Cultural and Creative Arts', classLevel: 'Primary 5' },
    { subjectName: 'Computer Studies', classLevel: 'Primary 5' },
    { subjectName: 'Agricultural Science', classLevel: 'Primary 5' },
    { subjectName: 'Social Studies', classLevel: 'Primary 5' },

    { subjectName: 'English Studies', classLevel: 'Primary 6' },
    { subjectName: 'Mathematics', classLevel: 'Primary 6' },
    { subjectName: 'Basic Science', classLevel: 'Primary 6' },
    { subjectName: 'Quantitative Reasoning', classLevel: 'Primary 6' },
    { subjectName: 'Verbal Reasoning', classLevel: 'Primary 6' },
    { subjectName: 'Cultural and Creative Arts', classLevel: 'Primary 6' },
    { subjectName: 'Computer Studies', classLevel: 'Primary 6' },
    { subjectName: 'Agricultural Science', classLevel: 'Primary 6' },
    { subjectName: 'Social Studies', classLevel: 'Primary 6' },
]; // <-- CLOSING ']'

const branchesToSeed = [
    { name: 'Main Campus', address: 'Gen. Hosp. Abor, Ogidi', code: 'AB' },
    { name: 'Umuoji Campus', address: 'Urudeke/Ifete Rd, Umuoji', code: 'UM' },
    { name: 'Adazi Ogidi Campus', address: 'Behind St. John Cath. Church, Adazi, Ogidi', code: 'AD' },
];

// --- MODIFIED: usersToSeed array to match User model requirements ---
const usersToSeed = [
    {
        fullName: 'Super Administrator', // Changed 'name' to 'fullName'
        email: 'admin@cityschoolsexams.com',
        password: 'benchycity1977',
        gender: 'Male', // Added required 'gender' field
        role: 'admin',
        isSuperAdmin: true,
    },
    {
        fullName: 'Main Campus Administrator',
        email: 'admin.abor@cityschoolsexams.com',
        password: 'benchycity1977',
        gender: 'Male',
        role: 'branch_admin',

    },
    {
        fullName: 'Adazi Campus Administrator',
        email: 'admin.adazi@cityschoolsexams.com',
        password: 'benchycity1977',
        gender: 'Male',
        role: 'branch_admin',

    },
    {
        fullName: 'Umuoji Campus Administrator',
        email: 'admin.umuoji@cityschoolsexams.com',
        password: 'benchycity1977',
        gender: 'Male',
        role: 'branch_admin',
    }
];

// --- Import Data Function ---
const importData = async () => {
    // Connect to the database using the shared connectDB function
    await connectDB();

    try {
        // 1. Clear all existing data from these collections
        console.log('Clearing existing data...'.red.inverse);
        await Subject.deleteMany({});
        await Branch.deleteMany({});
        await User.deleteMany({});
        console.log('Existing data cleared!'.red.inverse);

        // 2. Seed Subjects
        await Subject.insertMany(subjectsToSeed);
        console.log('Subjects Imported!'.green.inverse);

        // 3. Seed Branches and store the created documents (with their _id)
        const createdBranches = await Branch.insertMany(branchesToSeed);
        console.log('Branches Imported!'.green.inverse);

        // 4. Prepare and Seed Users
        const processedUsers = [];
        for (let user of usersToSeed) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(user.password, salt);

            // Create a new user object with the hashed password
            const newUser = {
                ...user,
                password: hashedPassword // Replace plaintext password with hashed one
            };

            // Dynamically link branch_admin users to their respective branches
            if (newUser.role === 'branch_admin') {
                let targetBranch = null;
                // Identify branch by fullName (matching the new field name in usersToSeed)
                if (newUser.fullName === 'Main Campus Administrator') {
                    targetBranch = createdBranches.find(b => b.name === 'Main Campus');
                } else if (newUser.fullName === 'Adazi Campus Administrator') {
                    targetBranch = createdBranches.find(b => b.name === 'Adazi Ogidi Campus');
                }
                else if (newUser.fullName === 'Umuoji Campus Administrator') {
                    targetBranch = createdBranches.find(b => b.name === 'Umuoji Campus');
                }
                // If target branch found, assign its ObjectId to branchId
                // Note: This assumes branchId is the field in User schema that references Branch
                if (targetBranch) {
                    newUser.branchId = targetBranch._id; // Assign the ObjectId of the branch, using branchId field
                } else {
                    console.warn(`Warning: Could not find target branch for branch_admin '${newUser.email}'. BranchId field will be null.`.yellow);
                    // If target branch not found, explicitly set branchId to null
                    // This will pass validation because branchId is only required if role is not 'admin'
                    newUser.branchId = null;
                }
            } else if (newUser.role === 'admin') {
                // For 'admin' role, explicitly ensure branchId is null as per schema
                newUser.branchId = null;
            }
            processedUsers.push(newUser);
        }

        await User.insertMany(processedUsers);
        console.log('Users Imported!'.green.inverse);

        console.log('All data imported successfully!'.blue.bold);
        process.exit(); // Exit the script after successful import
    } catch (error) {
        console.error(`Error during data import: ${error.message}`.red.inverse);
        process.exit(1); // Exit with a failure code
    }
};

// --- Destroy Data Function ---
const destroyData = async () => {
    // Connect to the database using the shared connectDB function
    await connectDB();

    try {
        console.log('Destroying all data...'.red.inverse);
        await Subject.deleteMany({});
        await Branch.deleteMany({});
        await User.deleteMany({});
        console.log('All data Destroyed!'.red.inverse);
        process.exit(); // Exit the script after successful destroy
    } catch (error) {
        console.error(`Error during data destroy: ${error.message}`.red.inverse);
        process.exit(1); // Exit with a failure code
    }
};

// --- Command Line Argument Handling ---
// To import: node seed.js
// To destroy: node seed.js -d
if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}