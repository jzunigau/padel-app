const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

const ADMIN_PASSWORD = 'padel-admin-2025';

app.use(cors());
app.use(express.json());

// Vercel provides a writable /tmp directory
const dataFilePath = path.join('/tmp', 'data.json');
const seedDataPath = path.join(process.cwd(), 'data.json');

// Synchronously check and create the data file if it doesn't exist.
// This runs once per serverless function instantiation.
try {
    if (!fs.existsSync(dataFilePath)) {
        if (fs.existsSync(seedDataPath)) {
            fs.copyFileSync(seedDataPath, dataFilePath);
        } else {
            fs.writeFileSync(dataFilePath, JSON.stringify({ players: [], teams: [], matches: [] }, null, 2));
        }
    }
} catch (error) {
    console.error("Error initializing data file:", error);
}

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Invalid or missing credentials' });
  }
};

// The path is now relative to the /api route.
// GET /api/data
app.get('/api/data', (req, res) => {
  fs.readFile(dataFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error reading data file' });
    }
    res.json(JSON.parse(data));
  });
});

// POST /api/data
app.post('/api/data', authenticate, (req, res) => {
  const newData = req.body;
  fs.writeFile(dataFilePath, JSON.stringify(newData, null, 2), (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error writing data file' });
    }
    res.json({ message: 'Data saved successfully' });
  });
});

// Export the app for Vercel
module.exports = app;