const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const owner = require("../controllers/owner");

const router = express.Router();

router.use(authenticate, authorize("STORE_OWNER"));
router.get("/dashboard", owner.getDashboard);

module.exports = router;
