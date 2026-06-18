const { Risk } = require('../models');

const populate = [
  { path: 'ownerId', select: 'name email avatar' },
  { path: 'createdBy', select: 'name email' },
];

// GET /api/risks?scopeType=&scopeId=
exports.list = async (req, res) => {
  try {
    const { scopeType, scopeId } = req.query;
    const filter = {};
    if (scopeType) filter.scopeType = scopeType;
    if (scopeId)   filter.scopeId   = scopeId;
    const risks = await Risk.find(filter).populate(populate).sort({ riskScore: -1 });
    res.json(risks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/risks
exports.create = async (req, res) => {
  try {
    const { scopeType, scopeId, title, description, category, probability, impact, status, mitigationPlan, ownerId, dueDate } = req.body;
    const risk = await Risk.create({
      scopeType, scopeId, title, description, category, probability, impact, status, mitigationPlan,
      ownerId: ownerId || req.user._id,
      dueDate,
      createdBy: req.user._id,
    });
    res.status(201).json(await risk.populate(populate));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/risks/:id
exports.getOne = async (req, res) => {
  try {
    const risk = await Risk.findById(req.params.id).populate(populate);
    if (!risk) return res.status(404).json({ message: 'Risk not found' });
    res.json(risk);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/risks/:id
exports.update = async (req, res) => {
  try {
    const allowed = ['title','description','category','probability','impact','status','mitigationPlan','ownerId','dueDate'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    if (updates.probability && updates.impact) updates.riskScore = updates.probability * updates.impact;
    const risk = await Risk.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate(populate);
    if (!risk) return res.status(404).json({ message: 'Risk not found' });
    res.json(risk);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/risks/:id
exports.remove = async (req, res) => {
  try {
    const risk = await Risk.findOne({ _id: req.params.id, deletedAt: null });
    if (!risk) return res.status(404).json({ message: 'Risk not found' });
    await risk.softDelete();
    res.json({ message: 'Risk deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/portfolios/:id/risk-matrix — handled in portfolioController
