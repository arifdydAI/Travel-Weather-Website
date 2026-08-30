const utils = require('./utils.js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let dest = null;
    if (req.query.id) {
      const destFound = utils.destinations.find((d) => d.id === req.query.id);
      if (!destFound) return res.status(404).json({ error: 'Destination not found' });
      dest = destFound;
    } else {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return res
          .status(400)
          .json({ error: 'lat and lon query parameters are required and must be numbers.' });
      }
      dest = { id: 'custom', name: 'Custom location', country: '', latitude: lat, longitude: lon };
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