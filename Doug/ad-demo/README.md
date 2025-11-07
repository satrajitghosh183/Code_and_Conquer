# Random YouTube Video Ad Demo

This is a simple demo that shows how to serve YouTube videos as ads using Node.js, a CSV file, and plain HTML/JavaScript.

## Files

- `videos.csv` - List of video links (id, link)
- `server.js` - Node.js backend (serves a random video from the CSV)
- `index.html` - Frontend page to request/show the video ad overlay

## Requirements

- Node.js
- npm packages: `express`, `csv-parser`

Install required packages with:
`npm install express csv-parser`

## Usage

1. Place all files in the same directory.
2. Run `node server.js`
3. Open `http://localhost:3000/index.html` in your browser.
