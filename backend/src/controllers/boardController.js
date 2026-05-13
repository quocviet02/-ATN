const Board  = require('../models/Board');
const Column = require('../models/Column');
const Task   = require('../models/Task');

exports.createBoard = async (req, res) => {
  try {
    const board = await Board.create({ projectId: req.params.projectId, name: req.body.name });
    res.status(201).json({ board });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getBoards = async (req, res) => {
  try {
    const boards = await Board.find({ projectId: req.params.projectId });
    res.json({ boards });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Returns the full board: columns + tasks (2 queries, no N+1)
exports.getBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const columns = await Column.find({ boardId: board._id }).sort('position');
    const tasks   = await Task.find({ columnId: { $in: columns.map((c) => c._id) } })
      .sort('position')
      .populate('assignee', 'name email avatar');

    const tasksByColumn = {};
    tasks.forEach((t) => {
      const key = t.columnId.toString();
      (tasksByColumn[key] ??= []).push(t.toJSON());
    });

    const result = columns.map((c) => ({
      ...c.toJSON(),
      tasks: tasksByColumn[c._id.toString()] ?? [],
    }));

    res.json({ board, columns: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBoard = async (req, res) => {
  try {
    const board = await Board.findByIdAndUpdate(
      req.params.boardId,
      { name: req.body.name },
      { new: true, runValidators: true }
    );
    if (!board) return res.status(404).json({ message: 'Board not found' });
    res.json({ board });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Cascade soft-delete: board → columns → tasks
exports.deleteBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const columns = await Column.find({ boardId: board._id });
    const columnIds = columns.map((c) => c._id);

    const now = new Date();
    await Task.updateMany({ columnId: { $in: columnIds }, deletedAt: null }, { deletedAt: now });
    await Column.updateMany({ boardId: board._id, deletedAt: null }, { deletedAt: now });
    await board.softDelete();

    res.json({ message: 'Board and all its columns and tasks deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
