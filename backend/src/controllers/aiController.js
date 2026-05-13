const Anthropic = require('@anthropic-ai/sdk');
const { Board, Column, Task } = require('../models');

// ─── Anthropic client ─────────────────────────────────────────────────────────

const client = new Anthropic({
  apiKey:     process.env.ANTHROPIC_API_KEY,
  timeout:    90_000,
  maxRetries: 1,
});

const MODEL = 'claude-sonnet-4-20250514';

// ─── Cached system prompts ────────────────────────────────────────────────────

const SYS_ANALYST = [
  {
    type: 'text',
    text:
      'Bạn là chuyên gia phân tích và quản lý dự án phần mềm. ' +
      'Hãy phân tích dữ liệu được cung cấp và trả lời bằng tiếng Việt, ' +
      'súc tích, có cấu trúc rõ ràng, dùng emoji khi phù hợp.',
    cache_control: { type: 'ephemeral' },
  },
];

const SYS_REPORTER = [
  {
    type: 'text',
    text:
      'Bạn là chuyên gia viết báo cáo quản lý dự án phần mềm.\n' +
      'Nhiệm vụ: tạo báo cáo tiến độ toàn diện dưới định dạng **Markdown**.\n' +
      'Cấu trúc bắt buộc:\n' +
      '1. Tổng quan dự án\n' +
      '2. Tiến độ theo từng board / cột\n' +
      '3. Phân tích rủi ro và task quá hạn\n' +
      '4. Thống kê theo độ ưu tiên và người phụ trách\n' +
      '5. Đề xuất hành động cụ thể\n\n' +
      'Ngôn ngữ: tiếng Việt. Dùng bảng, bullet list và số liệu cụ thể.',
    cache_control: { type: 'ephemeral' },
  },
];

// ─── Internal helpers ─────────────────────────────────────────────────────────

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
    byColumn[col]            = (byColumn[col]            ?? 0) + 1;
    byPriority[t.priority]   = (byPriority[t.priority]   ?? 0) + 1;
    const who = t.assignee?.name ?? 'Chưa gán';
    byAssignee[who]          = (byAssignee[who]          ?? 0) + 1;
    if (t.dueDate && new Date(t.dueDate) < now) overdue++;
  }

  const doneNames      = Object.keys(byColumn).filter(n => /done|complet|finish|closed|xong|hoàn/i.test(n));
  const doneTasks      = doneNames.reduce((s, n) => s + byColumn[n], 0);
  const completionRate = tasks.length ? +(doneTasks / tasks.length * 100).toFixed(1) : 0;

  return { total: tasks.length, byColumn, byPriority, byAssignee, overdue, doneTasks, completionRate };
}

function handleAIError(err, res) {
  console.error('[AI Module]', err.status ?? '', err.message);

  if (err.status === 529) {
    return res.status(503).json({ statusCode: 503, message: 'Claude API đang quá tải, vui lòng thử lại sau vài giây.', error: 'Service Unavailable' });
  }
  if (err.status === 408 || err.name === 'APIConnectionTimeoutError' || err.name === 'APITimeoutError') {
    return res.status(408).json({ statusCode: 408, message: 'Claude API không phản hồi đúng hạn (>90s). Hãy thử lại.', error: 'Request Timeout' });
  }
  if (err.status === 401) {
    return res.status(502).json({ statusCode: 502, message: 'ANTHROPIC_API_KEY không hợp lệ hoặc đã hết hạn.', error: 'Bad Gateway' });
  }
  if (err.status === 400) {
    return res.status(400).json({ statusCode: 400, message: err.message, error: 'Bad Request' });
  }
  return res.status(502).json({ statusCode: 502, message: 'Lỗi không xác định từ Claude API.', error: 'Bad Gateway' });
}

// ─── GET /api/projects/:id/ai/summary ────────────────────────────────────────

exports.getSummary = async (req, res) => {
  try {
    const project = req.project;
    const { boards, columns, tasks } = await getProjectData(req.params.id);

    const stats       = computeStats(columns, tasks);
    const taskContext = buildTaskContext(boards, columns, tasks);

    const response = await client.messages.create({
      model:      MODEL,
      max_tokens: 1500,
      system:     SYS_ANALYST,
      messages: [
        {
          role:    'user',
          content:
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
            `4. **🎯 Đề xuất hành động** (tối đa 3 điểm quan trọng nhất)`,
        },
      ],
    });

    const text = response.content.find(b => b.type === 'text')?.text ?? '';

    res.json({
      summary:     text,
      stats,
      model:       MODEL,
      usage:       response.usage,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) return handleAIError(e, res);
    res.status(500).json({ statusCode: 500, message: e.message, error: 'Internal Server Error' });
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
      return res.json({
        prediction:  'Dự án chưa có task nào để phân tích khả năng hoàn thành.',
        confidence:  null,
        stats:       null,
        generatedAt: new Date().toISOString(),
      });
    }

    const stats       = computeStats(columns, tasks);
    const taskContext = buildTaskContext(boards, columns, tasks);

    const deadlineInfo = deadline
      ? `Deadline dự án: ${deadline} (còn ${Math.ceil((new Date(deadline) - new Date()) / 86_400_000)} ngày)`
      : 'Deadline: Chưa xác định';

    const response = await client.messages.create({
      model:      MODEL,
      max_tokens: 1000,
      system:     SYS_ANALYST,
      messages: [
        {
          role:    'user',
          content:
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
            `4. **🚨 Hành động khẩn cấp** (nếu có nguy cơ trễ hạn)`,
        },
      ],
    });

    const text = response.content.find(b => b.type === 'text')?.text ?? '';

    res.json({
      prediction:  text,
      deadline:    deadline ?? null,
      stats,
      model:       MODEL,
      usage:       response.usage,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) return handleAIError(e, res);
    res.status(500).json({ statusCode: 500, message: e.message, error: 'Internal Server Error' });
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

    const stream = client.messages.stream({
      model:      MODEL,
      max_tokens: 4096,
      system:     SYS_REPORTER,
      messages: [
        {
          role:    'user',
          content:
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
            `**Danh sách task đầy đủ:**\n${taskContext}`,
        },
      ],
    });

    const message = await stream.finalMessage();
    const text    = message.content.find(b => b.type === 'text')?.text ?? '';

    res.json({
      report:      text,
      stats,
      model:       MODEL,
      usage:       message.usage,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) return handleAIError(e, res);
    res.status(500).json({ statusCode: 500, message: e.message, error: 'Internal Server Error' });
  }
};
