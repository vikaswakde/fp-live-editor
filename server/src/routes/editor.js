const express = require("express");
const router = express.Router();
const { startEditor, listContainers } = require("../services/editorService");

// Start editor endpoint
router.post("/start-editor", async (req, res) => {
  try {
    const { template } = req.body;
    const result = await startEditor(template);
    res.json(result);
  } catch (error) {
    console.error("Editor start error:", error);
    res.status(500).json({
      error: "Failed to start editor",
      details: error.message,
      json: error.json,
    });
  }
});

// List containers endpoint
router.get("/containers", (req, res) => {
  const containers = listContainers();
  res.json(containers);
});

module.exports = router;
