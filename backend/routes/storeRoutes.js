const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const stores = require("../controllers/stores");

const router = express.Router();

router.use(authenticate, authorize("USER"));
router.get("/", stores.listStores);
router.post("/:storeId/ratings", stores.createRating);
router.put("/:storeId/ratings", stores.updateRating);

module.exports = router;
