require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const swaggerUi   = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const connectDB   = require('./config/database');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:4200', credentials: true }));
app.use(express.json());

// ─── Swagger UI ───────────────────────────────────────────────────────────────

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Task Manager API',
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/projects', require('./routes/ai'));
app.use('/api/projects/:projectId/boards',                        require('./routes/boards'));
app.use('/api/projects/:projectId/boards/:boardId/columns',       require('./routes/columns'));
app.use('/api/boards',   require('./routes/boardTasks'));
app.use('/api/columns',  require('./routes/columnTasks'));
app.use('/api/tasks',    require('./routes/tasks'));
app.use('/api/comments', require('./routes/comments'));

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ statusCode: 404, message: 'Route not found', error: 'Not Found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ statusCode: 500, message: 'Internal server error', error: 'Internal Server Error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });
