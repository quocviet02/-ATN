const Column = require('../models/Column');
const Task   = require('../models/Task');

exports.createColumn = async (req, res) => {
  try {
    const { boardId } = req.params;
    const count = await Column.countDocuments({ boardId, deletedAt: null });
    const column = await Column.create({ boardId, name: req.body.name, position: count });
    res.status(201).json({ column });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getColumns = async (req, res) => {
  try {
    const columns = await Column.find({ boardId: req.params.boardId }).sort('position');
    res.json({ columns });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateColumn = async (req, res) => {
  try {
    const column = await Column.findByIdAndUpdate(
      req.params.columnId,
      { name: req.body.name },
      { new: true, runValidators: true }
    );
    if (!column) return res.status(404).json({ message: 'Column not found' });
    res.json({ column });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Reorder column within the same board
exports.moveColumn = async (req, res) => {
  try {
    const column = await Column.findById(req.params.columnId);
    if (!column) return res.status(404).json({ message: 'Column not found' });

    const { newPosition } = req.body;
    if (typeof newPosition !== 'number') {
      return res.status(400).json({ message: 'newPosition is required' });
    }

    const oldPosition = column.position;
    if (oldPosition === newPosition) return res.json({ column });

    if (newPosition > oldPosition) {
      await Column.updateMany(
        { boardId: column.boardId, position: { $gt: oldPosition, $lte: newPosition }, deletedAt: null },
        { $inc: { position: -1 } }
      );
    } else {
      await Column.updateMany(
        { boardId: column.boardId, position: { $gte: newPosition, $lt: oldPosition }, deletedAt: null },
        { $inc: { position: 1 } }
      );
    }

    column.position = newPosition;
    await column.save();
    res.json({ column });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cascade soft-delete: column → tasks
exports.deleteColumn = async (req, res) => {
  try {
    const column = await Column.findById(req.params.columnId);
    if (!column) return res.status(404).json({ message: 'Column not found' });

    await Task.updateMany({ columnId: column._id, deletedAt: null }, { deletedAt: new Date() });

    // Close gap: shift columns after this one down by 1
    await Column.updateMany(
      { boardId: column.boardId, position: { $gt: column.position }, deletedAt: null },
      { $inc: { position: -1 } }
    );

    await column.softDelete();
    res.json({ message: 'Column and its tasks deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
