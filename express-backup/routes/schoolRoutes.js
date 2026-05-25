const express = require("express");
const router = express.Router();
const { searchSchools } = require("../controllers/schoolController");

router.get("/search", searchSchools);

module.exports = router;
