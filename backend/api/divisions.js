const fs = require('fs');
const path = require('path');

const DISTRICTS_PATH = path.join(process.cwd(), 'data', 'districts.json');

function getDivisions() {
  const districtsData = JSON.parse(fs.readFileSync(DISTRICTS_PATH, 'utf8'));
  const divisionNames = [...new Set(districtsData.map(d => d.division))];
  return divisionNames.map(name => {
    const divisionDistricts = districtsData.filter(d => d.division === name);
    return {
      name,
      districtCount: divisionDistricts.length,
      destinationCount: divisionDistricts.reduce((sum, d) => sum + (d.destinationCount || 0), 0)
    };
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const divisions = getDivisions();
    res.status(200).json({ divisions });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};