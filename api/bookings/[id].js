const { updateBookingStatus, updateBookingDetails, getBookingById } = require('../_lib/data');

module.exports = async (req, res) => {
  const { id } = req.query || {};

  if (req.method === 'GET') {
    const booking = await getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    return res.status(200).json(booking);
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const updates = req.body || {};

  // If only status is provided, keep the constrained admin flow
  if (Object.keys(updates).length === 1 && typeof updates.status !== 'undefined') {
    if (!['accepted', 'completed'].includes(updates.status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "accepted" or "completed"' });
    }
    const ok = await updateBookingStatus(id, updates.status);
    if (!ok) return res.status(404).json({ error: 'Booking not found' });
    return res.status(200).json({ message: 'Booking status updated successfully' });
  }

  // Otherwise allow updating allowed booking fields
  const updated = await updateBookingDetails(id, updates);
  if (!updated) return res.status(404).json({ error: 'Booking not found or no valid fields provided' });
  return res.status(200).json({ message: 'Booking updated successfully', booking: updated });
};