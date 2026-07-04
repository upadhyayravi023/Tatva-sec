const express = require("express");
const router = express.Router();
const { createSport, getAllSports, updateSport, deleteSport } = require("../controllers/sportController");

router.get("/", getAllSports);
router.post("/", createSport);
router.put("/:id", updateSport);
router.delete("/:id", deleteSport);

module.exports = router;
