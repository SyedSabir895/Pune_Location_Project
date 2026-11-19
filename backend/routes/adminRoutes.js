const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const admin = require("../controllers/admin");

const router = express.Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/dashboard", admin.getDashboard);
router.post("/users", admin.createUser);
router.get("/users", admin.listUsers);
router.get("/users/:id", admin.getUserDetails);
router.post("/stores", admin.createStore);
router.get("/stores", admin.listStores);
router.get("/store-owners", admin.listStoreOwners);

module.exports = router;
