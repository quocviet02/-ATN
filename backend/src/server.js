require('dotenv').config();
const http    = require('http');
const express = require('express');
const cors    = require('cors');
const { Server: SocketIOServer } = require('socket.io');
const jwt     = require('jsonwebtoken');
const swaggerUi   = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const connectDB   = require('./config/database');

const app    = express();
const server = http.createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────────

const io = new SocketIOServer(server, {
  cors: {
    origin:      process.env.CLIENT_URL || 'http://localhost:4200',
    credentials: true,
  },
});

// JWT auth handshake middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    const { User } = require('./models');
    const decoded  = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user     = await User.findById(decoded.userId).select('_id');
    if (!user) return next(new Error('User not found'));
    socket.userId = user._id.toString();
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user_${socket.userId}`);
  socket.on('disconnect', () => {});
});

// Wire io into notification service
const notifService = require('./services/notificationService');
notifService.setIO(io);

// ─── Express middleware ───────────────────────────────────────────────────────

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:4200', credentials: true }));
app.use(express.json());

// ─── Swagger UI ───────────────────────────────────────────────────────────────

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Task Manager API',
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/projects',      require('./routes/projects'));
app.use('/api/projects',      require('./routes/ai'));
app.use('/api/projects/:projectId/boards',                        require('./routes/boards'));
app.use('/api/projects/:projectId/boards/:boardId/columns',       require('./routes/columns'));
app.use('/api/boards',        require('./routes/boardTasks'));
app.use('/api/columns',       require('./routes/columnTasks'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/comments',      require('./routes/comments'));
app.use('/api/invite',        require('./routes/invite'));

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ statusCode: 404, message: 'Route not found', error: 'Not Found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ statusCode: 500, message: 'Internal server error', error: 'Internal Server Error' });
});

// ─── Cron: expire pending invitations every hour ──────────────────────────────

const { ProjectInvitation, Task, ProjectMember } = require('./models');

function scheduleInvitationExpiry() {
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(async () => {
    try {
      const result = await ProjectInvitation.updateMany(
        { status: 'pending', expiredAt: { $lt: new Date() } },
        { $set: { status: 'expired' } }
      );
      if (result.modifiedCount > 0) {
        console.log(`[Cron] Expired ${result.modifiedCount} invitation(s)`);
      }
    } catch (e) {
      console.error('[Cron] Error expiring invitations:', e.message);
    }
  }, ONE_HOUR);
}

// ─── Cron: deadline notifications every hour ─────────────────────────────────

function scheduleDeadlineNotifications() {
  const ONE_HOUR = 60 * 60 * 1000;
  const run = async () => {
    try {
      const now        = new Date();
      const in24h      = new Date(now.getTime() + 24 * ONE_HOUR);
      const yesterday  = new Date(now.getTime() - ONE_HOUR);

      // Tasks due in next 24h with assignee
      const dueSoon = await Task.find({
        dueDate:   { $gte: now, $lte: in24h },
        assignee:  { $ne: null },
        deletedAt: null,
      }).select('title assignee dueDate');

      for (const task of dueSoon) {
        notifService.create({
          recipient: task.assignee,
          type:      'task_due_soon',
          title:     'Task sắp đến hạn',
          body:      `"${task.title}" sẽ đến hạn trong 24 giờ tới`,
          link:      `/project/board`,
          meta:      { taskId: task._id },
        });
      }

      // Overdue tasks (dueDate passed within the last hour)
      const overdue = await Task.find({
        dueDate:   { $gte: yesterday, $lt: now },
        assignee:  { $ne: null },
        deletedAt: null,
      }).select('title assignee dueDate');

      for (const task of overdue) {
        notifService.create({
          recipient: task.assignee,
          type:      'task_overdue',
          title:     'Task đã quá hạn',
          body:      `"${task.title}" đã quá hạn`,
          link:      `/project/board`,
          meta:      { taskId: task._id },
        });
      }
    } catch (e) {
      console.error('[Cron] Deadline notifications error:', e.message);
    }
  };

  setInterval(run, ONE_HOUR);
}

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    scheduleInvitationExpiry();
    scheduleDeadlineNotifications();
    server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });
