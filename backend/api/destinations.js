const fs = require('fs');
const path = require('path');

const DESTINATIONS_PATH = require('path').join(process.cwd(), 'data', 'destinations.json');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const destinationsData = JSON.parse(require('fs').readFileSync(require('path').join(process.cwd(), 'data', 'destinations.json'), 'utf8'));

    if (req.method === 'GET') {
      const { id } = req.query;

      if (id) {
        // Single destination
        const dest = destinationsData.find(d => d.id === id);
        if (!dest) {
          return res.status(404).json({ error: 'Destination not found' });
        }
        return res.status(200).json(dest);
      } else {
        // List all destinations (without weather)
        const destinations = destinationsData.map(d => ({
          id: d.id,
          name: d.name,
          country: d.country,
          latitude: d.latitude,
          longitude: d.longitude,
          category: d.category,
          shortDescription: d.shortDescription,
          image: d.image,
          location: d.location
        }));
        res.status(200).json({ count: destinations.length, destinations });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};