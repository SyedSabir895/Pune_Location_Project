const express = require("express");
const register = require("../controllers/register");
const login = require("../controllers/login");
const updatePassword = require("../controllers/updatePassword");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.put("/password", authenticate, updatePassword);

module.exports = router;
