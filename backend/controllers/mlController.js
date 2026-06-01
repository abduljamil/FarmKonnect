const mongoose = require('mongoose');

exports.getMonitoring = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database not connected' });
    }

    const coll = db.collection('ml_monitoring');
    const latest = await coll.find().sort({ generated_at: -1 }).limit(1).toArray();
    res.status(200).json({ success: true, data: latest[0] || null });
  } catch (err) {
    console.error('mlController.getMonitoring error', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getJobRuns = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database not connected' });
    }

    const coll = db.collection('ml_job_runs');
    const runs = await coll.find().sort({ finished_at: -1 }).limit(50).toArray();
    res.status(200).json({ success: true, data: runs });
  } catch (err) {
    console.error('mlController.getJobRuns error', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
