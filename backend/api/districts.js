const fs = require('fs');
const path = require('path');

const DISTRICTS_PATH = path.join(process.cwd(), 'data', 'districts.json');

function getDistrictsForDivision(division) {
  const districtsData = JSON.parse(require('fs').readFileSync(require('path').join(process.cwd(), 'data', 'districts.json'), 'utf8'));
  return districtsData
    .filter(d => d.division === division)
    .map(d => ({
      id: d.id,
      name: d.name,
      division: d.division,
      latitude: d.latitude,
      longitude: d.longitude,
      destinationCount: d.destinationCount || 0
    }));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const division = req.query.division;
    if (!division) {
      return res.status(400).json({ error: 'division query parameter is required' });
    }

    const districtsData = JSON.parse(require('fs').readFileSync(require('path').join(process.cwd(), 'data', 'districts.json'), 'utf8'));
    
    const districts = districtsData
      .filter(d => d.division === division)
      .map(d => ({
        id: d.id,
        name: d.name,
        division: d.division,
        latitude: d.latitude,
        longitude: d.longitude,
        destinationCount: d.destinationCount || 0
      }));

    if (districts.length === 0) {
      return res.status(404).json({ error: 'Division not found' });
    }

    res.status(200).json({ division, districts });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};