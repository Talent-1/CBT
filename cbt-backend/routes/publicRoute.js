// cbt-backend/routes/publicRoute.js
const express = require('express');
const router = express.Router();
const { getAllBranches } = require('../controllers/branchController'); // Import the controller

router.get('/branches', getAllBranches);

module.exports = router;