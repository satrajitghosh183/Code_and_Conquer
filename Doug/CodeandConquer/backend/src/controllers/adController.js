import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get a random ad from the CSV file
 */
export const getRandomAd = (req, res) => {
  try {
    const csvPath = path.join(__dirname, '../../data/ads.csv');
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'Ads file not found' });
    }

    // Read CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    // Skip header line
    const adLines = lines.slice(1).filter(line => line.trim());
    
    if (adLines.length === 0) {
      return res.status(404).json({ error: 'No ads available' });
    }

    // Parse CSV and get random ad
    // Simple CSV parser that handles quoted fields
    const ads = adLines.map(line => {
      const fields = [];
      let currentField = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      fields.push(currentField.trim()); // Add last field
      
      const youtube_url = fields[0] || '';
      const title = fields[1] || 'Advertisement';
      
      return { youtube_url, title };
    });

    // Get random ad
    const randomIndex = Math.floor(Math.random() * ads.length);
    const randomAd = ads[randomIndex];

    res.json(randomAd);
  } catch (error) {
    console.error('Error reading ads:', error);
    res.status(500).json({ error: 'Failed to fetch ad' });
  }
};

