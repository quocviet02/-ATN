const { TimeOff, User } = require('../models');

const populate = [
  { path: 'userId', select: 'name email avatar' },
  { path: 'approvedBy', select: 'name email' },
];

// GET /api/timeoffs/my
exports.listMine = async (req, res) => {
  try {
    const items = await TimeOff.find({ userId: req.user._id }).populate(populate).sort({ startDate: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/timeoffs?userId=&organizationId=&startDate=&endDate=
exports.list = async (req, res) => {
  try {
    const { userId, organizationId, startDate, endDate, status } = req.query;
    const filter = {};
    if (userId)         filter.userId         = userId;
    if (organizationId) filter.organizationId = organizationId;
    if (status)         filter.status         = status;
    if (startDate && endDate) {
      filter.startDate = { $lte: new Date(endDate) };
      filter.endDate   = { $gte: new Date(startDate) };
    }
    const items = await TimeOff.find(filter).populate(populate).sort({ startDate: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/timeoffs
exports.create = async (req, res) => {
  try {
    const { type, startDate, endDate, reason, hoursPerDay, organizationId } = req.body;
    const item = await TimeOff.create({
      userId: req.user._id,
      organizationId: organizationId || null,
      type, startDate, endDate, reason,
      hoursPerDay: hoursPerDay || 8,
    });
    res.status(201).json(await item.populate(populate));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/timeoffs/:id/approve
exports.approve = async (req, res) => {
  try {
    const item = await TimeOff.findByIdAndUpdate(req.params.id,
      { status: 'approved', approvedBy: req.user._id },
      { new: true }
    ).populate(populate);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/timeoffs/:id/reject
exports.reject = async (req, res) => {
  try {
    const item = await TimeOff.findByIdAndUpdate(req.params.id,
      { status: 'rejected', approvedBy: req.user._id },
      { new: true }
    ).populate(populate);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/timeoffs/:id/cancel
exports.cancel = async (req, res) => {
  try {
    const item = await TimeOff.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'cancelled' },
      { new: true }
    ).populate(populate);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/organizations/:orgId/timeoff-calendar?startDate=&endDate=
exports.getOrgCalendar = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {
      organizationId: req.organization._id,
      status: 'approved',
    };
    if (startDate && endDate) {
      filter.startDate = { $lte: new Date(endDate) };
      filter.endDate   = { $gte: new Date(startDate) };
    }
    const items = await TimeOff.find(filter).populate('userId', 'name email avatar').sort({ startDate: 1 });
    res.json(items);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
