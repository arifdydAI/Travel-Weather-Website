const utils = require('../../backend/api/utils.js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Vercel provides path parameters in req.query for [id].js files
    const id = req.query.id;
    
    if (!id) {
      return res.status(400).json({ error: 'Destination ID is required' });
    }

    const dest = utils.destinations.find((d) => d.id === id);
    if (!dest) {
      return res.status(404).json({ error: 'Destination not found' });
    }

    const dateStr = req.query.date || utils.todayLocal();
    const parsed = utils.parseDate(dateStr);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
    }

    const result = await utils.withWeather(dest, dateStr);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};