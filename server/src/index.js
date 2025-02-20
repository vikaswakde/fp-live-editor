const express = require("express");
const cors = require("cors");
const path = require("path");
const editorRoutes = require("./routes/editor");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../client/public")));

// Routes
app.use("/api/editor", editorRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
