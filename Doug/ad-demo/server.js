// Import required modules
const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const app = express();

// Serve static files (e.g., index.html) in the same directory
app.use(express.static(__dirname));

// Read CSV and pick a random video link helper function
function getRandomVideo(callback) {
  const videos = [];
  fs.createReadStream('videos.csv')
    .pipe(csv())
    .on('data', row => videos.push(row))
    .on('end', () => {
      const choice = videos[Math.floor(Math.random() * videos.length)];
      callback(choice);
    });
}

// API endpoint: Returns a random YouTube URL from CSV
app.get('/api/video-ad', (req, res) => {
  getRandomVideo((video) => {
    res.json({ youtube_url: video.link });
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});