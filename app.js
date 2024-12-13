const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(err));

const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: String,
});

const Url = mongoose.model("Url", urlSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(async (req, res, next) => {
  const urls = await Url.find({});

  if (!urls) {
    res.locals.urls = null;
    return next();
  }

  res.locals.urls = urls;
  next();
});

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/api/short", async (req, res) => {
  try {
    let { url } = req.body;

    if (!/^https?:\/\//i.test(url)) {
      url = `http://${url}`;
    }

    const shortUrl = crypto.randomBytes(4).toString("hex");

    const newUrl = new Url({
      original_url: url,
      short_url: shortUrl,
    });

    await newUrl.save();

    res.status(200).redirect("/");
  } catch (err) {
    console.error("Error saving url", err);
    res.status(500).json({ message: "Error saving url" });
  }
});

app.post("/api/long", async (req, res) => {
  try {
    const { shortUrl } = req.body;

    const url = await Url.findOne({ short_url: shortUrl });

    if (!url) {
      return res.status(404).json({ message: "Url not found" });
    }

    res.status(200).redirect("/");
  } catch (err) {
    console.error("Error finding url", err);
    res.status(500).json({ message: "Error finding url" });
  }
});

app.get("/:shortUrl", async (req, res) => {
  try {
    const { shortUrl } = req.params;

    const url = await Url.findOne({ short_url: shortUrl });

    if (url) {
      return res.redirect(url.original_url);
    } else {
      return res.status(404).json({ message: "Url not found" });
    }
  } catch (err) {
    console.error("Error finding url", err);
    res.status(500).json({ message: "Error finding url" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
