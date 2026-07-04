const Sport = require("../models/Sport");

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

// @desc    Create a new sport score card
// @route   POST /api/sports
// @access  Public
const createSport = async (req, res) => {
  try {
    const { event_name, campus, is_live, winner } = req.body;

    const team_names = normalizeArray(req.body.team_names);
    const scoreRaw = normalizeArray(req.body.score);

    const score = scoreRaw.map((s) => Number(s));

    if (!event_name || !campus || team_names.length < 2 || score.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "event_name, campus, team_names (>=2), and score (>=2) are required",
      });
    }

    const sport = await Sport.create({
      event_name,
      campus,
      is_live: is_live === true || is_live === "true",
      winner: winner || null,
      team_names,
      score,
    });

    res.status(201).json({ success: true, data: sport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all sport score cards
// @route   GET /api/sports
// @access  Public
const getAllSports = async (req, res) => {
  try {
    const sports = await Sport.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: sports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update an existing sport score card
// @route   PUT /api/sports/:id
// @access  Public
const updateSport = async (req, res) => {
  try {
    const sport = await Sport.findById(req.params.id);
    if (!sport) {
      return res.status(404).json({ success: false, message: "Score card not found" });
    }

    const { event_name, campus, is_live, winner } = req.body;

    const team_names = req.body.team_names ? normalizeArray(req.body.team_names) : undefined;
    const scoreRaw = req.body.score ? normalizeArray(req.body.score) : undefined;

    if (event_name !== undefined) sport.event_name = event_name;
    if (campus !== undefined) sport.campus = campus;
    if (is_live !== undefined) sport.is_live = is_live === true || is_live === "true";
    if (winner !== undefined) sport.winner = winner || null;

    if (team_names) sport.team_names = team_names;
    if (scoreRaw) sport.score = scoreRaw.map((s) => Number(s));

    await sport.save();

    res.json({ success: true, data: sport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete an existing sport score card
// @route   DELETE /api/sports/:id
// @access  Public
const deleteSport = async (req, res) => {
  try {
    const sport = await Sport.findById(req.params.id);
    if (!sport) {
      return res.status(404).json({ success: false, message: "Score card not found" });
    }

    await sport.deleteOne();

    res.json({ success: true, message: "Score card deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createSport,
  getAllSports,
  updateSport,
  deleteSport,
};
