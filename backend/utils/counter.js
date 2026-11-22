// Counter utility for atomic sequential IDs
// Uses a single document per counter type in the 'counters' collection.
// Example usage: const next = await getNextSequence('bill');

const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // counter name, e.g., 'bill'
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Atomically increments and returns the next sequence number for a given counter.
 * @param {string} name - Counter name (e.g., 'bill')
 * @returns {Promise<number>} - The next integer sequence value.
 */
async function getNextSequence(name) {
  const updated = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return updated.seq;
}

module.exports = { getNextSequence };
