const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const app = express();

app.use(express.static(__dirname));

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

app.get('/api/video-ad', (req, res) => {
  getRandomVideo((video) => {
    res.json({ youtube_url: video.link });
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});