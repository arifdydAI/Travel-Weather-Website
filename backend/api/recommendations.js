const utils = require('./utils.js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const dateStr = req.query.date || utils.todayLocal();
    const parsed = utils.parseDate(dateStr);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
    }

    const results = await Promise.all(
      utils.destinations.map((d) => utils.withWeather(d, dateStr))
    );
    results.sort((a, b) => b.travelScore - a.travelScore);

    res.status(200).json({
      date: dateStr,
      count: results.length,
      recommendations: results,
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};