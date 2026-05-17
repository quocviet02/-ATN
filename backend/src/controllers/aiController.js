const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Board, Column, Task } = require('../models');

// ─── Gemini client ────────────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = 'gemini-2.0-flash';

// ─── System instructions ──────────────────────────────────────────────────────

const SYS_ANALYST =
  'Bạn là chuyên gia phân tích và quản lý dự án phần mềm. ' +
  'Hãy phân tích dữ liệu được cung cấp và trả lời bằng tiếng Việt, ' +
  'súc tích, có cấu trúc rõ ràng, dùng emoji khi phù hợp.';

const SYS_REPORTER =
  'Bạn là chuyên gia viết báo cáo quản lý dự án phần mềm.\n' +
  'Nhiệm vụ: tạo báo cáo tiến độ toàn diện dưới định dạng **Markdown**.\n' +
  'Cấu trúc bắt buộc:\n' +
  '1. Tổng quan dự án\n' +
  '2. Tiến độ theo từng board / cột\n' +
  '3. Phân tích rủi ro và task quá hạn\n' +
  '4. Thống kê theo độ ưu tiên và người phụ trách\n' +
  '5. Đề xuất hành động cụ thể\n\n' +
  'Ngôn ngữ: tiếng Việt. Dùng bảng, bullet list và số liệu cụ thể.';

const SYS_DEADLINE =
  'Bạn là chuyên gia ước tính thời gian trong quản lý dự án phần mềm.\n' +
  'Nhiệm vụ: phân tích thông tin task và đưa ra gợi ý deadline hợp lý.\n' +
  'Quy tắc:\n' +
  '- suggestedDeadline phải >= ngày hôm nay, định dạng YYYY-MM-DD\n' +
  '- estimatedDays là số ngày làm việc thực tế kể từ hôm nay\n' +
  '- confidence: "high" nếu có dữ liệu lịch sử rõ ràng, "medium" nếu ước tính tương đối, "low" nếu thiếu dữ liệu\n' +
  '- alternatives: 2-3 lựa chọn (lạc quan và thận trọng hơn)\n' +
  '- warnings: rủi ro nếu workload cao, priority cao, hoặc ước tính quá ngắn';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getProjectData(projectId) {
  const boards = await Board.find({ projectId });
  if (!boards.length) return { boards: [], columns: [], tasks: [] };

  const boardIds = boards.map(b => b._id);
  const columns  = await Column.find({ boardId: { $in: boardIds } }).sort({ position: 1 });
  if (!columns.length) return { boards, columns: [], tasks: [] };

  const columnIds = columns.map(c => c._id);
  const tasks     = await Task.find({ columnId: { $in: columnIds } })
    .populate('assignee', 'name')
    .sort({ position: 1 });

  return { boards, columns, tasks };
}

function buildTaskContext(boards, columns, tasks) {
  if (!tasks.length) return 'Dự án hiện chưa có task nào.';

  const colMap   = Object.fromEntries(columns.map(c => [c._id.toString(), c]));
  const boardMap = Object.fromEntries(boards.map(b => [b._id.toString(), b]));
  const now      = new Date();

  return tasks
    .map(t => {
      const col     = colMap[t.columnId.toString()];
      const board   = col ? boardMap[col.boardId.toString()] : null;
      const overdue = t.dueDate && new Date(t.dueDate) < now ? ' ⚠️ QUÁ HẠN' : '';
      return (
        `- [${board?.name ?? '?'} / ${col?.name ?? '?'}] "${t.title}" ` +
        `| Priority: ${t.priority} ` +
        `| Assignee: ${t.assignee?.name ?? 'Chưa gán'} ` +
        `| Hạn: ${t.dueDate ?? 'Không có'}${overdue}`
      );
    })
    .join('\n');
}

function computeStats(columns, tasks) {
  const colMap     = Object.fromEntries(columns.map(c => [c._id.toString(), c.name]));
  const byColumn   = {};
  const byPriority = { low: 0, medium: 0, high: 0, critical: 0 };
  const byAssignee = {};
  const now        = new Date();
  let   overdue    = 0;

  for (const t of tasks) {
    const col = colMap[t.columnId.toString()] ?? 'Unknown';
    byColumn[col]          = (byColumn[col]          ?? 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
    const who = t.assignee?.name ?? 'Chưa gán';
    byAssignee[who]        = (byAssignee[who]        ?? 0) + 1;
    if (t.dueDate && new Date(t.dueDate) < now) overdue++;
  }

  const doneNames      = Object.keys(byColumn).filter(n => /done|complet|finish|closed|xong|hoàn/i.test(n));
  const doneTasks      = doneNames.reduce((s, n) => s + byColumn[n], 0);
  const completionRate = tasks.length ? +(doneTasks / tasks.length * 100).toFixed(1) : 0;

  return { total: tasks.length, byColumn, byPriority, byAssignee, overdue, doneTasks, completionRate };
}

function handleGeminiError(err, res) {
  const msg = err.message || '';
  console.error('[AI Module]', err.status ?? '', msg);

  if (err.status === 429 || /quota|rate.?limit/i.test(msg)) {
    return res.status(503).json({ statusCode: 503, message: 'Gemini API đang quá tải, vui lòng thử lại sau vài giây.', error: 'Service Unavailable' });
  }
  if (err.status === 403 || /api.?key|permission/i.test(msg)) {
    return res.status(502).json({ statusCode: 502, message: 'GEMINI_API_KEY không hợp lệ hoặc đã hết hạn.', error: 'Bad Gateway' });
  }
  if (/timeout|timed.?out/i.test(msg)) {
    return res.status(408).json({ statusCode: 408, message: 'Gemini API không phản hồi đúng hạn. Hãy thử lại.', error: 'Request Timeout' });
  }
  return res.status(502).json({ statusCode: 502, message: 'Lỗi từ Gemini API: ' + (msg || 'Không xác định.'), error: 'Bad Gateway' });
}

function geminiUsage(result) {
  const u = result.response.usageMetadata ?? {};
  return { input_tokens: u.promptTokenCount ?? 0, output_tokens: u.candidatesTokenCount ?? 0 };
}

// ─── POST /api/tasks/:id/suggest-deadline ────────────────────────────────────

exports.suggestDeadline = async (req, res) => {
  try {
    const task = req.task;

    const board = await Board.findById(task.boardId).select('projectId');
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const allBoards  = await Board.find({ projectId: board.projectId }).select('_id');
    const boardIds   = allBoards.map(b => b._id);
    const allColumns = await Column.find({ boardId: { $in: boardIds } });
    const columnIds  = allColumns.map(c => c._id);

    const doneColumnIds = allColumns
      .filter(c => /done|complet|finish|closed|xong|hoàn/i.test(c.name))
      .map(c => c._id);

    const completedTasks = await Task.find({ columnId: { $in: doneColumnIds }, deletedAt: null })
      .select('title priority createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(15);

    let workloadCount = 0, highPriorityCount = 0;
    if (task.assignee) {
      const openTasks = await Task.find({
        assignee:  task.assignee,
        columnId:  { $in: columnIds, $nin: doneColumnIds },
        deletedAt: null,
        _id:       { $ne: task._id },
      }).select('priority');
      workloadCount     = openTasks.length;
      highPriorityCount = openTasks.filter(t => ['high', 'critical'].includes(t.priority)).length;
    }

    const today        = new Date().toISOString().split('T')[0];
    const historyLines = completedTasks.map(t => {
      const days = Math.max(1, Math.ceil((new Date(t.updatedAt) - new Date(t.createdAt)) / 86_400_000));
      return `- "${t.title}" | ${t.priority} | ~${days} ngày`;
    });

    const prompt =
      `Ngày hôm nay: ${today}\n\n` +
      `Task cần gợi ý deadline:\n` +
      `- Tiêu đề: "${task.title}"\n` +
      `- Mô tả: ${task.description || 'Không có'}\n` +
      `- Độ ưu tiên: ${task.priority}\n` +
      `- Deadline hiện tại: ${task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : 'Chưa có'}\n\n` +
      (completedTasks.length
        ? `Task đã hoàn thành gần đây (tham khảo thời gian):\n${historyLines.join('\n')}\n\n`
        : `Chưa có task hoàn thành nào để tham khảo.\n\n`) +
      `Khối lượng người thực hiện: ${workloadCount} task đang mở` +
      (highPriorityCount ? `, ${highPriorityCount} task high/critical` : '') + '\n\n' +
      `Trả về JSON với schema:\n` +
      `{"suggestedDeadline":"YYYY-MM-DD","estimatedDays":number,"confidence":"high|medium|low","reasoning":"string","warnings":["string"],"alternatives":[{"date":"YYYY-MM-DD","label":"string"}]}`;

    const model  = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYS_DEADLINE,
      generationConfig:  { responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());

    res.json({ ...parsed, generatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[suggestDeadline]', e.name, e.message);
    if (e instanceof SyntaxError) {
      return res.status(502).json({ statusCode: 502, message: 'AI trả về dữ liệu không hợp lệ, vui lòng thử lại.', error: 'Parse Error' });
    }
    handleGeminiError(e, res);
  }
};

// ─── GET /api/projects/:id/ai/summary ────────────────────────────────────────

exports.getSummary = async (req, res) => {
  try {
    const project = req.project;
    const { boards, columns, tasks } = await getProjectData(req.params.id);
    const stats       = computeStats(columns, tasks);
    const taskContext = buildTaskContext(boards, columns, tasks);

    const model  = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYS_ANALYST });
    const prompt =
      `Dự án: "${project.name}"\n` +
      `Mô tả: ${project.description || 'Không có'}\n\n` +
      `**Số liệu nhanh:**\n` +
      `- Tổng task: ${stats.total} | Hoàn thành: ${stats.doneTasks} (${stats.completionRate}%) | Quá hạn: ${stats.overdue}\n` +
      `- Critical: ${stats.byPriority.critical} | High: ${stats.byPriority.high} | Medium: ${stats.byPriority.medium} | Low: ${stats.byPriority.low}\n\n` +
      `**Danh sách task:**\n${taskContext}\n\n` +
      `Hãy phân tích và cung cấp:\n` +
      `1. **📊 Tóm tắt tiến độ** (2-3 câu tổng quan)\n` +
      `2. **✅ Điểm mạnh** (bullet list)\n` +
      `3. **⚠️ Rủi ro / Vấn đề** (bullet list, ưu tiên task quá hạn và critical)\n` +
      `4. **🎯 Đề xuất hành động** (tối đa 3 điểm quan trọng nhất)`;

    const result = await model.generateContent(prompt);
    const text   = result.response.text();

    res.json({ summary: text, stats, model: MODEL, usage: geminiUsage(result), generatedAt: new Date().toISOString() });
  } catch (e) {
    handleGeminiError(e, res);
  }
};

// ─── GET /api/projects/:id/ai/statistics ─────────────────────────────────────

exports.getStatistics = async (req, res) => {
  try {
    const { columns, tasks } = await getProjectData(req.params.id);
    const stats = computeStats(columns, tasks);
    res.json({ ...stats, generatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ statusCode: 500, message: e.message, error: 'Internal Server Error' });
  }
};

// ─── POST /api/projects/:id/ai/predict ───────────────────────────────────────

exports.predict = async (req, res) => {
  try {
    const project      = req.project;
    const { deadline } = req.body;
    const { boards, columns, tasks } = await getProjectData(req.params.id);

    if (!tasks.length) {
      return res.json({ prediction: 'Dự án chưa có task nào để phân tích khả năng hoàn thành.', confidence: null, stats: null, generatedAt: new Date().toISOString() });
    }

    const stats        = computeStats(columns, tasks);
    const taskContext  = buildTaskContext(boards, columns, tasks);
    const deadlineInfo = deadline
      ? `Deadline dự án: ${deadline} (còn ${Math.ceil((new Date(deadline) - new Date()) / 86_400_000)} ngày)`
      : 'Deadline: Chưa xác định';

    const model  = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYS_ANALYST });
    const prompt =
      `Dự án: "${project.name}"\n` +
      `${deadlineInfo}\n\n` +
      `**Thống kê hiện tại:**\n` +
      `- Tổng: ${stats.total} task | Xong: ${stats.doneTasks} (${stats.completionRate}%) | Quá hạn: ${stats.overdue}\n` +
      `- Critical: ${stats.byPriority.critical} | High: ${stats.byPriority.high}\n\n` +
      `**Danh sách task:**\n${taskContext}\n\n` +
      `Dựa trên dữ liệu trên, hãy dự đoán:\n` +
      `1. **🔮 Kết quả dự đoán**: Sẽ hoàn thành đúng hạn / Có nguy cơ trễ / Chắc chắn trễ\n` +
      `2. **📈 Mức độ tin cậy**: Cao / Trung bình / Thấp + lý do\n` +
      `3. **🔑 Yếu tố quyết định** (2-3 yếu tố chính)\n` +
      `4. **🚨 Hành động khẩn cấp** (nếu có nguy cơ trễ hạn)`;

    const result = await model.generateContent(prompt);
    const text   = result.response.text();

    res.json({ prediction: text, deadline: deadline ?? null, stats, model: MODEL, usage: geminiUsage(result), generatedAt: new Date().toISOString() });
  } catch (e) {
    handleGeminiError(e, res);
  }
};

// ─── POST /api/projects/:id/ai/report ────────────────────────────────────────

exports.generateReport = async (req, res) => {
  try {
    const project = req.project;
    const { boards, columns, tasks } = await getProjectData(req.params.id);
    const stats       = computeStats(columns, tasks);
    const taskContext = buildTaskContext(boards, columns, tasks);

    const statsTable =
      Object.entries(stats.byColumn)
        .map(([col, count]) => `| ${col} | ${count} | ${(count / (stats.total || 1) * 100).toFixed(1)}% |`)
        .join('\n');

    const assigneeTable =
      Object.entries(stats.byAssignee)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => `| ${name} | ${count} |`)
        .join('\n');

    const model  = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYS_REPORTER });
    const prompt =
      `**Tên dự án:** ${project.name}\n` +
      `**Mô tả:** ${project.description || 'Không có mô tả'}\n` +
      `**Ngày tạo báo cáo:** ${new Date().toLocaleDateString('vi-VN')}\n\n` +
      `**Tổng quan:**\n` +
      `- Tổng task: ${stats.total}\n` +
      `- Hoàn thành: ${stats.doneTasks} (${stats.completionRate}%)\n` +
      `- Task quá hạn: ${stats.overdue}\n\n` +
      `**Task theo cột:**\n` +
      `| Cột | Số task | Tỷ lệ |\n|-----|---------|-------|\n${statsTable}\n\n` +
      `**Task theo người phụ trách:**\n` +
      `| Người phụ trách | Số task |\n|----------------|----------|\n${assigneeTable}\n\n` +
      `**Danh sách task đầy đủ:**\n${taskContext}`;

    const result = await model.generateContent(prompt);
    const text   = result.response.text();

    res.json({ report: text, stats, model: MODEL, usage: geminiUsage(result), generatedAt: new Date().toISOString() });
  } catch (e) {
    handleGeminiError(e, res);
  }
};
