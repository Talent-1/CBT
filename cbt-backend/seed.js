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

const subjectsToSeed = [
    // JSS1 Subjects
    { name: 'Mathematics', classLevel: 'JSS1' },
    { name: 'English Language', classLevel: 'JSS1' },
    { name: 'Basic Science and Technology', classLevel: 'JSS1' },
    { name: 'Pre-Vocational Studies', classLevel: 'JSS1' },
    { name: 'Igbo Language', classLevel: 'JSS1' },
    { name: 'Christian Religious Studies', classLevel: 'JSS1' },
    { name: 'History', classLevel: 'JSS1' },
    { name: 'Cultural and Creative Arts', classLevel: 'JSS1' },
    { name: 'National Value Education', classLevel: 'JSS1' },
    { name: 'Computer and PHE', classLevel: 'JSS1' },
    { name: 'French', classLevel: 'JSS1' },
    { name: 'Business Studies', classLevel: 'JSS1' },
    { name: 'Skills Acquisition', classLevel: 'JSS1' },

    // JSS2 Subjects
    { name: 'Mathematics', classLevel: 'JSS2' },
    { name: 'English Language', classLevel: 'JSS2' },
    { name: 'Basic Science and Technology', classLevel: 'JSS2' },
    { name: 'Pre-Vocational Studies', classLevel: 'JSS2' },
    { name: 'Igbo Language', classLevel: 'JSS2' },
    { name: 'Christian Religious Studies', classLevel: 'JSS2' },
    { name: 'History', classLevel: 'JSS2' },
    { name: 'Cultural and Creative Arts', classLevel: 'JSS2' },
    { name: 'National Value Education', classLevel: 'JSS2' },
    { name: 'Computer and PHE', classLevel: 'JSS2' },
    { name: 'French', classLevel: 'JSS2' },
    { name: 'Business Studies', classLevel: 'JSS2' },
    { name: 'Skills Acquisition', classLevel: 'JSS2' },

    // JSS3 Subjects
    { name: 'Mathematics', classLevel: 'JSS3' },
    { name: 'English Language', classLevel: 'JSS3' },
    { name: 'Basic Science and Technology', classLevel: 'JSS3' },
    { name: 'Pre-Vocational Studies', classLevel: 'JSS3' },
    { name: 'Igbo Language', classLevel: 'JSS3' },
    { name: 'Christian Religious Studies', classLevel: 'JSS3' },
    { name: 'History', classLevel: 'JSS3' },
    { name: 'Cultural and Creative Arts', classLevel: 'JSS3' },
    { name: 'National Value Education', classLevel: 'JSS3' },
    { name: 'Computer and PHE', classLevel: 'JSS3' },
    { name: 'French', classLevel: 'JSS3' },
    { name: 'Business Studies', classLevel: 'JSS3' },
    { name: 'Skills Acquisition', classLevel: 'JSS3' },

    // SS1 Subjects
    { name: 'Mathematics', classLevel: 'SS1' },
    { name: 'English Language', classLevel: 'SS1' },
    { name: 'Physics', classLevel: 'SS1' },
    { name: 'Chemistry', classLevel: 'SS1' },
    { name: 'Biology', classLevel: 'SS1' },
    { name: 'Igbo Language', classLevel: 'SS1' },
    { name: 'Christian Religious Studies', classLevel: 'SS1' },
    { name: 'Geography', classLevel: 'SS1' },
    { name: 'Economics', classLevel: 'SS1' },
    { name: 'Accounting', classLevel: 'SS1' },
    { name: 'Agricultural Science', classLevel: 'SS1' },
    { name: 'Animal Husbandry', classLevel: 'SS1' },
    { name: 'Data Processing', classLevel: 'SS1' },
    { name: 'Government', classLevel: 'SS1' },
    { name: 'Commerce', classLevel: 'SS1' },
    { name: 'Literature-in-English', classLevel: 'SS1' },
    { name: 'Further Mathematics', classLevel: 'SS1' },
    { name: 'Marketing', classLevel: 'SS1' },

    // SS2 Subjects
    { name: 'Mathematics', classLevel: 'SS2' },
    { name: 'English Language', classLevel: 'SS2' },
    { name: 'Physics', classLevel: 'SS2' },
    { name: 'Chemistry', classLevel: 'SS2' },
    { name: 'Biology', classLevel: 'SS2' },
    { name: 'Igbo Language', classLevel: 'SS2' },
    { name: 'Christian Religious Studies', classLevel: 'SS2' },
    { name: 'Geography', classLevel: 'SS2' },
    { name: 'Economics', classLevel: 'SS2' },
    { name: 'Accounting', classLevel: 'SS2' },
    { name: 'Agricultural Science', classLevel: 'SS2' },
    { name: 'Animal Husbandry', classLevel: 'SS2' },
    { name: 'Data Processing', classLevel: 'SS2' },
    { name: 'Government', classLevel: 'SS2' },
    { name: 'Commerce', classLevel: 'SS2' },
    { name: 'Literature-in-English', classLevel: 'SS2' },
    { name: 'Further Mathematics', classLevel: 'SS2' },
    { name: 'Marketing', classLevel: 'SS2' },

    // SS3 Subjects
    { name: 'Mathematics', classLevel: 'SS3' },
    { name: 'English Language', classLevel: 'SS3' },
    { name: 'Physics', classLevel: 'SS3' },
    { name: 'Chemistry', classLevel: 'SS3' },
    { name: 'Biology', classLevel: 'SS3' },
    { name: 'Igbo Language', classLevel: 'SS3' },
    { name: 'Christian Religious Studies', classLevel: 'SS3' },
    { name: 'Geography', classLevel: 'SS3' },
    { name: 'Economics', classLevel: 'SS3' },
    { name: 'Accounting', classLevel: 'SS3' },
    { name: 'Agricultural Science', classLevel: 'SS3' },
    { name: 'Animal Husbandry', classLevel: 'SS3' },
    { name: 'Data Processing', classLevel: 'SS3' },
    { name: 'Government', classLevel: 'SS3' },
    { name: 'Commerce', classLevel: 'SS3' },
    { name: 'Literature-in-English', classLevel: 'SS3' },
    { name: 'Further Mathematics', classLevel: 'SS3' },
    { name: 'Marketing', classLevel: 'SS3' },

    // Primary School Subjects
    { name: 'English Studies', classLevel: 'Primary 1' },
    { name: 'Mathematics', classLevel: 'Primary 1' },
    { name: 'Basic Science', classLevel: 'Primary 1' },
    { name: 'Quantitative Reasoning', classLevel: 'Primary 1' },
    { name: 'Verbal Reasoning', classLevel: 'Primary 1' },
    { name: 'Cultural and Creative Arts', classLevel: 'Primary 1' },
    { name: 'Computer Studies', classLevel: 'Primary 1' },
    { name: 'Agricultural Science', classLevel: 'Primary 1' },
    { name: 'Social Studies', classLevel: 'Primary 1' },

    { name: 'English Studies', classLevel: 'Primary 2' },
    { name: 'Mathematics', classLevel: 'Primary 2' },
    { name: 'Basic Science', classLevel: 'Primary 2' },
    { name: 'Quantitative Reasoning', classLevel: 'Primary 2' },
    { name: 'Verbal Reasoning', classLevel: 'Primary 2' },
    { name: 'Cultural and Creative Arts', classLevel: 'Primary 2' },
    { name: 'Computer Studies', classLevel: 'Primary 2' },
    { name: 'Agricultural Science', classLevel: 'Primary 2' },
    { name: 'Social Studies', classLevel: 'Primary 2' },

    { name: 'English Studies', classLevel: 'Primary 3' },
    { name: 'Mathematics', classLevel: 'Primary 3' },
    { name: 'Basic Science', classLevel: 'Primary 3' },
    { name: 'Quantitative Reasoning', classLevel: 'Primary 3' },
    { name: 'Verbal Reasoning', classLevel: 'Primary 3' },
    { name: 'Cultural and Creative Arts', classLevel: 'Primary 3' },
    { name: 'Computer Studies', classLevel: 'Primary 3' },
    { name: 'Agricultural Science', classLevel: 'Primary 3' },
    { name: 'Social Studies', classLevel: 'Primary 3' },

    { name: 'English Studies', classLevel: 'Primary 4' },
    { name: 'Mathematics', classLevel: 'Primary 4' },
    { name: 'Basic Science', classLevel: 'Primary 4' },
    { name: 'Quantitative Reasoning', classLevel: 'Primary 4' },
    { name: 'Verbal Reasoning', classLevel: 'Primary 4' },
    { name: 'Cultural and Creative Arts', classLevel: 'Primary 4' },
    { name: 'Computer Studies', classLevel: 'Primary 4' },
    { name: 'Agricultural Science', classLevel: 'Primary 4' },
    { name: 'Social Studies', classLevel: 'Primary 4' },

    { name: 'English Studies', classLevel: 'Primary 5' },
    { name: 'Mathematics', classLevel: 'Primary 5' },
    { name: 'Basic Science', classLevel: 'Primary 5' },
    { name: 'Quantitative Reasoning', classLevel: 'Primary 5' },
    { name: 'Verbal Reasoning', classLevel: 'Primary 5' },
    { name: 'Cultural and Creative Arts', classLevel: 'Primary 5' },
    { name: 'Computer Studies', classLevel: 'Primary 5' },
    { name: 'Agricultural Science', classLevel: 'Primary 5' },
    { name: 'Social Studies', classLevel: 'Primary 5' },

    { name: 'English Studies', classLevel: 'Primary 6' },
    { name: 'Mathematics', classLevel: 'Primary 6' },
    { name: 'Basic Science', classLevel: 'Primary 6' },
    { name: 'Quantitative Reasoning', classLevel: 'Primary 6' },
    { name: 'Verbal Reasoning', classLevel: 'Primary 6' },
    { name: 'Cultural and Creative Arts', classLevel: 'Primary 6' },
    { name: 'Computer Studies', classLevel: 'Primary 6' },
    { name: 'Agricultural Science', classLevel: 'Primary 6' },
    { name: 'Social Studies', classLevel: 'Primary 6' },
];

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