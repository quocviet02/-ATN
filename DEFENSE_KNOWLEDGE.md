# 📚 TÀI LIỆU BẢO VỆ ĐỒ ÁN TỐT NGHIỆP
## Hệ thống Quản lý Dự án & Công việc (Project & Task Manager)

> **Sinh viên:** Nguyễn Quốc Việt | **Mô hình:** Client-Server, RESTful API + WebSocket  
> **Ngày cập nhật:** 2026-06-10 | **Tổng câu hỏi chuẩn bị:** 65+

---

## MỤC LỤC

1. [Kiến trúc tổng quan](#phần-1-kiến-trúc-tổng-quan)
2. [Công nghệ và thư viện](#phần-2-công-nghệ-và-thư-viện)
3. [Luồng nghiệp vụ chi tiết](#phần-3-luồng-nghiệp-vụ-chi-tiết)
4. [Cơ sở dữ liệu MongoDB](#phần-4-cơ-sở-dữ-liệu-mongodb)
5. [Bảo mật](#phần-5-bảo-mật)
6. [API Documentation](#phần-6-api-documentation)
7. [Câu hỏi hội đồng thường gặp](#phần-7-câu-hỏi-hội-đồng-thường-gặp)
8. [Demo Script](#phần-8-demo-script)
9. [Điểm yếu và cách trả lời](#phần-9-điểm-yếu-và-cách-trả-lời)
10. [Ghi chú quan trọng](#phần-10-ghi-chú-quan-trọng)

---

# PHẦN 1: KIẾN TRÚC TỔNG QUAN

## 1.1 Mô hình kiến trúc

Hệ thống áp dụng kiến trúc **Client-Server tách biệt hoàn toàn**, phân thành 3 tầng rõ ràng:

```
╔══════════════════════════════════════════════════════════════════╗
║                    PRESENTATION LAYER (Frontend)                  ║
║  Angular 20 SPA — chạy trên trình duyệt tại localhost:4200        ║
║  • Standalone Components  • Akita State Management               ║
║  • ng-zorro-antd UI        • ngx-translate i18n                  ║
╚════════════════════════════╦═════════════════════════════════════╝
                             ║
              ┌──────────────┴──────────────┐
              │   HTTP/REST (JWT Bearer)     │
              │   WebSocket (Socket.IO)      │
              └──────────────┬──────────────┘
                             ║
╔════════════════════════════╩═════════════════════════════════════╗
║                   APPLICATION LAYER (Backend)                     ║
║  Node.js + Express — chạy tại localhost:3000                      ║
║  • Routes → Middleware → Controller                               ║
║  • Socket.IO Server   • NotificationService                       ║
║  • WorkflowEngine     • EmailService (Nodemailer)                 ║
║  • CronJobs (SLA check, deadline notify, invitation expiry)       ║
╚════════════════════════════╦═════════════════════════════════════╝
                             ║
              ┌──────────────┴──────────────┐
              │   Mongoose ODM              │
              └──────────────┬──────────────┘
                             ║
╔════════════════════════════╩═════════════════════════════════════╗
║                      DATA LAYER (Database)                        ║
║  MongoDB — chạy tại localhost:27017/task_manager                  ║
║  13 Collections: users, projects, projectmembers, boards,        ║
║  columns, tasks, comments, activitylogs, notifications,           ║
║  projectinvitations, refreshtokens, workflows, releases           ║
╚══════════════════════════════════════════════════════════════════╝
```

### Luồng dữ liệu một Request điển hình:

```
Browser                 Angular Service          Express Backend           MongoDB
   │                         │                        │                       │
   │──[User action]──►│       │                        │                       │
   │                  │──[HTTP POST /api/tasks]──►│    │                       │
   │                  │       │          │─[auth middleware verify JWT]        │
   │                  │       │          │─[checkTask middleware]──────►│      │
   │                  │       │          │◄─────────────────────────────│      │
   │                  │       │          │─[checkPermission middleware]        │
   │                  │       │          │─[Controller logic]──────────►│      │
   │                  │       │          │◄─────────────────────────────│      │
   │                  │       │          │─[Socket.IO emit to room]            │
   │                  │       │◄──[JSON response]──────│                       │
   │                  │─[Update Akita store]            │                       │
   │◄──[Re-render UI]─│       │                        │                       │
   │                  │       │                        │                       │
   │    [Other tabs receive real-time via Socket.IO]    │                       │
```

## 1.2 Cấu trúc thư mục

### Backend (`backend/src/`)

```
src/
├── server.js              # Entry point: Express + Socket.IO + cron jobs
├── config/
│   └── database.js        # MongoDB connection (Singleton pattern)
├── models/                # Mongoose schemas — DATA LAYER
│   ├── User.js            # Người dùng
│   ├── Project.js         # Dự án (có soft delete)
│   ├── ProjectMember.js   # Thành viên + role + permissions
│   ├── Board.js           # Kanban board
│   ├── Column.js          # Cột trong board (To Do, In Progress, Done...)
│   ├── Task.js            # Task/issue (model lớn nhất)
│   ├── Comment.js         # Bình luận task
│   ├── ActivityLog.js     # Lịch sử hoạt động task
│   ├── Notification.js    # Thông báo realtime
│   ├── ProjectInvitation.js # Lời mời qua email
│   ├── RefreshToken.js    # JWT refresh token lưu DB
│   ├── Workflow.js        # Custom workflow engine
│   ├── Release.js         # Quản lý release
│   └── index.js           # Export tất cả models
├── controllers/           # Xử lý business logic — CONTROLLER
│   ├── authController.js  # Đăng ký, đăng nhập, JWT
│   ├── projectController.js
│   ├── boardController.js
│   ├── columnController.js
│   ├── taskController.js  # CRUD + move task
│   ├── commentController.js
│   ├── memberController.js
│   ├── invitationController.js # Mời thành viên qua email
│   ├── notificationController.js
│   ├── activityController.js
│   ├── aiController.js    # Groq LLaMA AI (gợi ý deadline, báo cáo)
│   ├── workflowController.js
│   ├── releasesController.js
│   └── timelineController.js
├── routes/                # Định tuyến URL — ROUTER
│   ├── auth.js            # /api/auth/*
│   ├── projects.js        # /api/projects/*
│   ├── boards.js, columns.js, tasks.js...
│   ├── ai.js              # /api/projects/:id/ai/*
│   ├── workflows.js
│   ├── releases.js
│   └── timeline.js
├── middleware/            # Middleware chain
│   ├── auth.js / authMiddleware.js  # Verify JWT
│   ├── checkPermission.js # Role-based + permission-based
│   ├── checkTask.js       # Load task + membership
│   ├── checkProjectMember.js
│   ├── checkRole.js
│   └── validate.js        # express-validator
├── services/
│   ├── notificationService.js  # Lưu DB + emit Socket.IO
│   └── workflowEngine.js       # State machine logic
└── utils/
    ├── activityLogger.js   # Ghi lịch sử hoạt động
    ├── emailService.js     # Nodemailer + HTML template
    └── ioInstance.js       # Singleton Socket.IO instance
```

**Lý do tổ chức (Separation of Concerns):**
- `models/` chỉ biết về data schema, không biết business logic
- `controllers/` chỉ xử lý request/response, không biết về HTTP routing
- `routes/` chỉ định nghĩa URL mapping và middleware chain
- `services/` chứa logic tái sử dụng độc lập với request/response
- `middleware/` xử lý cross-cutting concerns (auth, permission, validation)

### Frontend (`frontend/src/app/`)

```
app/
├── app.routes.ts          # Root routes: /login, /project/*, /invite/*
├── auth/login/            # Trang đăng nhập
├── core/
│   ├── guards/auth.guard.ts      # Route guard: redirect nếu chưa đăng nhập
│   ├── interceptors/jwt.interceptor.ts  # Tự động gắn Bearer token
│   ├── services/
│   │   ├── notification.service.ts  # Socket.IO client + unread count
│   │   ├── permission.service.ts    # Observable-based permission checks
│   │   └── token.service.ts         # localStorage token management
│   └── validators/        # Custom Angular validators
├── interface/             # TypeScript interfaces (DTOs)
│   ├── issue.ts           # JIssue (task model phía FE)
│   ├── project.ts         # JProject
│   ├── user.ts            # JUser
│   ├── workflow.ts        # Workflow types
│   └── release.ts         # Release types + constants
├── project/
│   ├── project.component.ts    # Shell component (layout)
│   ├── project.routes.ts       # Child routes: /board, /settings...
│   ├── project.guard.ts        # Load project data on route activate
│   ├── auth/                   # Akita auth store
│   ├── state/
│   │   ├── project/            # Akita project store (query/store/service)
│   │   ├── filter/             # Board filter state
│   │   ├── workflow/           # Workflow service
│   │   └── releases/           # Releases service
│   ├── components/
│   │   ├── board/              # Kanban board (CDK DragDrop)
│   │   ├── issues/             # Issue detail, modal, workflow section
│   │   └── navigation/         # Navbar, sidebar, notification bell
│   └── pages/
│       ├── board/              # Board page
│       ├── settings/           # Project settings
│       ├── members/            # Member management
│       ├── timeline/           # Gantt chart (frappe-gantt)
│       ├── workflow/           # Workflow designer (SVG)
│       └── releases/           # Releases management
└── assets/i18n/
    ├── vi.json             # Tiếng Việt
    └── en.json             # English
```

## 1.3 Design Patterns đã áp dụng

### 1. MVC (Model-View-Controller)
**Là gì:** Tách ứng dụng thành 3 phần: Model (data), View (UI), Controller (logic).

**Áp dụng ở backend:**
- **Model:** `backend/src/models/*.js` — Mongoose schemas định nghĩa cấu trúc dữ liệu
- **Controller:** `backend/src/controllers/*.js` — Xử lý business logic, tương tác với models
- **View:** Không có (API server trả JSON, không có template)
- **Router** đóng vai trò điều hướng request đến đúng Controller

**Ví dụ cụ thể:**
```javascript
// Model: Task.js — chỉ biết về data
const taskSchema = new mongoose.Schema({ title: String, priority: String, ... })

// Controller: taskController.js — xử lý logic
exports.createTask = async (req, res) => {
  const task = await Task.create({ title, priority, ... });
  activityLogger.log(task.id, ...);
  res.status(201).json({ task });
}

// Route: tasks.js — chỉ điều hướng
router.post('/:columnId/tasks', checkColumn, taskCtrl.createTask);
```

### 2. Singleton Pattern
**Là gì:** Đảm bảo chỉ có một instance duy nhất của một class/module.

**Áp dụng ở 3 nơi:**
- **Database connection:** `config/database.js` — `mongoose.connect()` chỉ gọi 1 lần khi server khởi động
- **Socket.IO instance:** `utils/ioInstance.js` — lưu trữ `_io` globally, các service dùng `getIO()` để lấy
- **Notification service:** `services/notificationService.js` — một instance dùng chung, set IO 1 lần

```javascript
// ioInstance.js — Singleton
let _io = null;
exports.setIO = (io) => { _io = io; };
exports.getIO = () => _io;
```

### 3. Middleware Pattern (Chain of Responsibility)
**Là gì:** Xử lý request qua chuỗi các hàm middleware trước khi đến controller.

**Áp dụng:** Express middleware chain
```
Request → auth.js (verify JWT) → checkTask.js (load task) → checkPermission.js (check role) → controller
```

**Ví dụ trong `tasks.js`:**
```javascript
router.put('/:id/move',
  checkTask,                    // load task, set req.task + req.membership
  checkPermission('canDragTask'), // check permission
  taskCtrl.moveTask              // business logic
);
```

### 4. Observer Pattern
**Là gì:** Subject phát sự kiện, nhiều Observer lắng nghe và phản ứng.

**Áp dụng ở 2 tầng:**
- **Backend:** Socket.IO — server emit event, các client connected lắng nghe
  ```javascript
  // Emit event đến room của user
  io.to(`user_${userId}`).emit('notification', data);
  io.to(`user_${memberId}`).emit('task_deleted', { taskId, title });
  ```
- **Frontend:** RxJS — `BehaviorSubject`, `Subject`, `Observable` khắp nơi
  ```typescript
  // NotificationService — Observable streams
  readonly unreadCount$ = new BehaviorSubject<number>(0);
  readonly toast$ = new Subject<AppNotification>();
  readonly taskDeleted$ = new Subject<TaskDeletedEvent>();
  ```

### 5. Repository Pattern (qua Mongoose)
**Là gì:** Lớp trừu tượng hóa việc truy cập database, code nghiệp vụ không cần biết SQL/query cụ thể.

**Áp dụng:** Mongoose models đóng vai trò Repository
```javascript
// Thay vì viết MongoDB query trực tiếp:
db.collection('tasks').find({ ... })

// Dùng Mongoose (Repository):
Task.find({ boardId }).populate('assignee').sort({ position: 1 })
```

### 6. Strategy Pattern
**Là gì:** Định nghĩa tập hợp các thuật toán, đóng gói từng cái, cho phép thay thế nhau.

**Áp dụng:** AI deadline suggestion với fallback strategy
```javascript
// Strategy 1: Groq AI
try {
  const text = await callGroq(SYS_DEADLINE, prompt, true);
  return res.json(JSON.parse(text));
}
// Strategy 2: Rule-based fallback (khi AI không khả dụng)
catch (aiErr) {
  const fallback = suggestDeadlineRuleBased(task, completedTasks, ...);
  return res.json(fallback);
}
```

### 7. State Pattern (Workflow Engine)
**Là gì:** Đối tượng thay đổi hành vi khi trạng thái nội tại thay đổi.

**Áp dụng:** `services/workflowEngine.js`
```javascript
// Task có trạng thái (currentStateId)
// Transition chỉ hợp lệ nếu fromStateId === task.currentStateId
exports.getAvailableTransitions = function (workflow, task, userId, userRole) {
  return workflow.transitions.filter(t =>
    t.fromStateId === task.currentStateId &&
    canUserTransition(t, userId, userRole)
  );
};
```

---

# PHẦN 2: CÔNG NGHỆ VÀ THƯ VIỆN

## FRONTEND

### Angular 20
| Thông tin | Chi tiết |
|-----------|---------|
| **Version** | 20.3.18 (latest LTS) |
| **Là gì** | Framework SPA của Google, TypeScript-first, component-based |
| **Tại sao chọn** | Ecosystem hoàn chỉnh (router, forms, HTTP client built-in), TypeScript mạnh, Standalone Components v20 không cần NgModule |
| **So với React** | Angular có kiến trúc rõ ràng hơn (MVC-like), phù hợp dự án lớn. React linh hoạt hơn nhưng cần chọn thêm nhiều thư viện |
| **So với Vue** | Angular dùng TypeScript native, dependency injection tốt hơn, enterprise-ready hơn |
| **Dùng ở đâu** | Toàn bộ frontend, đặc biệt Standalone Components từ v15+ |
| **Cấu hình quan trọng** | `angular.json`, `tsconfig.json`, path aliases `@trungk18/*` → `src/app/*` |

**Câu hỏi hội đồng có thể hỏi:**
- *Angular 20 dùng Standalone Components là gì?* → Không cần khai báo trong NgModule, import thẳng vào `@Component({ imports: [...] })`, giảm boilerplate code

### TypeScript 5.8
- **Là gì:** Superset của JavaScript với static typing
- **Tại sao:** Bắt lỗi tại compile time thay vì runtime, IntelliSense tốt hơn, refactoring an toàn hơn
- **Dùng ở đâu:** Toàn bộ `frontend/src/**/*.ts`

### @datorama/akita 7.1.1
| Thông tin | Chi tiết |
|-----------|---------|
| **Là gì** | State management library cho Angular, dựa trên RxJS |
| **So với NgRx** | Ít boilerplate hơn NgRx (không cần actions/reducers riêng), API đơn giản hơn |
| **So với BehaviorSubject thuần** | Có DevTools, query pattern, update immutable, entity management |
| **Dùng ở đâu** | `project/state/project/` (project.store.ts, project.query.ts, project.service.ts), `project/auth/` |
| **Pattern** | Store (state) → Query (selector) → Service (updater) |

**Ví dụ từ code thực tế:**
```typescript
// project.store.ts — định nghĩa state
export interface ProjectState { id: string; name: string; issues: JIssue[]; ... }

// project.query.ts — reactive selectors
issues$ = this.select('issues');
myRole$ = this.select('myRole');

// project.service.ts — update state
this._store.update({ issues: [...mapped], columns: [...] });
```

### ng-zorro-antd 20.4.4
- **Là gì:** Thư viện UI component Ant Design cho Angular
- **Tại sao:** Component phong phú (Modal, Table, Form, DatePicker, Tag...), tương thích Angular 20, hỗ trợ i18n
- **Dùng ở đâu:** Toàn bộ UI components — `nz-card`, `nz-modal`, `nz-tag`, `nz-date-picker`, `nz-table`, `nz-progress`, `nz-statistic`
- **Cấu hình quan trọng:** `NZ_I18N` provider + `registerLocaleData(vi)` trong `main.ts` để date picker hoạt động

### RxJS 7.8.1
- **Là gì:** Reactive Extensions for JavaScript — xử lý async streams bằng Observables
- **Dùng ở đâu:**
  - `jwt.interceptor.ts`: `BehaviorSubject<string|null>` để queue các request khi đang refresh token
  - `notification.service.ts`: `BehaviorSubject<number>` cho unread count, `Subject<>` cho toast và task_deleted
  - `permission.service.ts`: `combineLatest([role$, permissions$])` để tính quyền
  - `project.service.ts`: `switchMap`, `forkJoin`, `tap`, `catchError`
- **Operators quan trọng:** `pipe`, `map`, `filter`, `switchMap`, `catchError`, `combineLatest`, `take`, `tap`

### Angular CDK DragDrop
- **Là gì:** Component Development Kit — `@angular/cdk/drag-drop` cho kéo thả
- **Dùng ở đâu:** `board-dnd.component.ts` và `board-dnd-list.component.ts`
- **Cơ chế:** `CdkDragDrop` event → `moveItemInArray()` (same column) hoặc `transferArrayItem()` (khác column) → gọi API `PUT /api/tasks/:id/move`

```typescript
// board-dnd.component.ts
dropColumn(event: CdkDragDrop<ProjectColumn[]>): void {
  moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
  this._projectService.moveColumn(movedCol.id, event.currentIndex);
}
```

### Angular HttpClient + JWT Interceptor
- **Interceptor:** `jwt.interceptor.ts` tự động gắn `Authorization: Bearer <token>` vào mọi request
- **Token refresh logic:** Khi nhận 401 `TOKEN_EXPIRED`:
  1. Nếu đang refresh → queue request vào `refreshDone$`
  2. Nếu chưa refresh → gọi `/auth/refresh-token`, lưu token mới, retry request gốc
  3. Nếu refresh thất bại → logout + redirect `/login`

### @ngx-translate/core 17.0.0
- **Là gì:** Thư viện internationalization (i18n) cho Angular
- **Cơ chế:** `HttpLoaderFactory` đọc `assets/i18n/vi.json` / `en.json` → `TranslateService`
- **Dùng trong template:** `{{ 'nav.board' | translate }}`
- **Dùng trong TS:** `this._translate.instant('key')`
- **Lưu lựa chọn:** `localStorage.setItem('lang', lang)` trong `LanguageSwitcherComponent`

### Socket.IO Client 4.8.3
- **Kết nối:** `io(wsUrl, { auth: { token }, transports: ['websocket'] })`
- **Xác thực:** Gửi JWT trong `auth.token` → backend verify trong `io.use()` handshake middleware
- **Events lắng nghe:** `notification` (toast + badge), `task_deleted` (xóa task khỏi board)
- **Reconnection:** `reconnection: true, reconnectionDelay: 2000`

### frappe-gantt 1.2.2
- **Là gì:** Thư viện Gantt chart JavaScript
- **Dùng ở đâu:** `pages/timeline/gantt-chart/gantt-chart.component.ts`
- **Hiển thị:** Timeline đa dự án tại `/project/timeline`

### Tailwind CSS 3.4.17
- **Là gì:** Utility-first CSS framework
- **Dùng ở đâu:** Một số component dùng class Tailwind (`text-xl`, `flex`, `gap-2`...) song song với SCSS component

---

## BACKEND

### Node.js
- **Là gì:** JavaScript runtime trên server, single-threaded, event-driven, non-blocking I/O
- **Tại sao:** Phù hợp cho ứng dụng real-time (Socket.IO), I/O intensive, cùng ngôn ngữ JS với frontend, npm ecosystem lớn

### Express 4.18.2
- **Là gì:** Minimal web framework cho Node.js
- **Tại sao chọn thay vì NestJS:** Nhẹ hơn, ít abstraction hơn, dễ học, không over-engineering cho dự án vừa
- **Cấu trúc:** `app.use(cors)` → `app.use(express.json())` → routes → controllers

### Mongoose 8.23.1
- **Là gì:** ODM (Object Document Mapper) cho MongoDB
- **Tại sao:** Schema validation, middleware hooks (pre/post), virtual fields, populate (JOIN-like), TypeScript support
- **Pattern quan trọng:**
  - `pre(/^find/, ...)`: soft delete filter — tự động thêm `{ deletedAt: null }` vào mọi query
  - `toJSON: { virtuals: true, transform: ... }`: chuyển `_id` → `id`, xóa `__v`

### MongoDB (Atlas/localhost)
- **Là gì:** NoSQL document database, lưu dữ liệu dạng JSON documents
- **Connection:** `mongoose.connect(process.env.MONGODB_URI)` — `mongodb://localhost:27017/task_manager`
- **Tại sao:** Schema flexible (task có thể có nhiều field tùy workflow), JSON native, tốt cho prototype

### Socket.IO 4.8.3
- **Là gì:** Thư viện WebSocket với fallback và auto-reconnect
- **Tại sao thay vì WebSocket thuần:** Auto-reconnection, room/namespace management, fallback to polling khi WebSocket bị chặn, authentication middleware
- **Room pattern:** Mỗi user join room `user_{userId}` → server emit `io.to('user_xxx').emit()` để gửi private event

### jsonwebtoken 9.0.0
- **Là gì:** Thư viện tạo và verify JWT (JSON Web Token)
- **Cấu trúc JWT:** `Header.Payload.Signature` (base64url encoded)
  - Header: `{ "alg": "HS256", "typ": "JWT" }`
  - Payload: `{ "userId": "...", "iat": ..., "exp": ... }`
  - Signature: `HMAC-SHA256(header + "." + payload, SECRET)`
- **2 loại token:**
  - **AccessToken:** hết hạn sau `15m`, lưu trong memory (Akita store)
  - **RefreshToken:** hết hạn sau `7d`, lưu trong MongoDB collection `refreshtokens`
- **Tại sao 2 token:** AccessToken ngắn hạn giới hạn thời gian bị lộ; RefreshToken dài hạn có thể revoke trong DB

### bcryptjs 2.4.3
- **Là gì:** Thư viện hash password với salt
- **Tại sao thay vì SHA-256:** bcrypt chậm cố ý (cost factor 10) → brute force khó; có salt ngẫu nhiên → cùng password có hash khác nhau; resistant to rainbow table attacks
- **Dùng ở đâu:** `authController.js` — `bcrypt.hash(password, 10)` khi register; `bcrypt.compare(password, hash)` khi login

### nodemailer 8.0.7
- **Là gì:** Thư viện gửi email từ Node.js
- **Cấu hình SMTP:** `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_USER`, `MAIL_PASSWORD` (Gmail App Password)
- **Dùng ở đâu:** `utils/emailService.js` — gửi invitation email với HTML template
- **Dev mode:** Nếu chưa cấu hình SMTP → log ra console thay vì gửi thật

### @google/generative-ai (Gemini) + Groq SDK
- **AI thực tế dùng:** **Groq SDK** với model `llama-3.3-70b-versatile` (KHÔNG phải Gemini như mô tả ban đầu)
- **4 chức năng AI:**
  1. `suggestDeadline` — gợi ý deadline + fallback rule-based
  2. `getSummary` — phân tích tiến độ dự án
  3. `predict` — dự đoán khả năng hoàn thành đúng deadline
  4. `generateReport` — tạo báo cáo Markdown
- **Fallback pattern:** Nếu Groq API lỗi/rate-limit → tự tính deadline bằng rule-based algorithm

### express-validator 7.0.1
- **Là gì:** Middleware validate request body
- **Dùng ở đâu:** `routes/auth.js` — validate email, password length, name không rỗng
```javascript
body('email').isEmail().normalizeEmail(),
body('password').isLength({ min: 6 })
```

### cors 2.8.5
- **Cấu hình:** Chỉ allow `process.env.CLIENT_URL || 'http://localhost:4200'`
- **Mục đích:** Ngăn cross-origin request từ domain không được phép

### swagger-ui-express 5.0.0
- **Dùng ở đâu:** `GET /api/docs` — UI documentation
- **swagger.js:** Định nghĩa API spec

---

# PHẦN 3: LUỒNG NGHIỆP VỤ CHI TIẾT

## 3.1 ĐĂNG KÝ TÀI KHOẢN

```
User                Frontend               Backend                  MongoDB
 │                    │                       │                         │
 │──[Nhập form]──►│   │                       │                         │
 │                │──validate (email, pass≥6, name required)            │
 │                │──[POST /api/auth/register]──►│                      │
 │                │                 │──express-validator check          │
 │                │                 │──User.findOne({ email })──►│      │
 │                │                 │◄──null (chưa tồn tại)──────│      │
 │                │                 │──bcrypt.hash(pass, 10)            │
 │                │                 │──User.create({ name, email, hash })──►│
 │                │                 │──jwt.sign({ userId }, ACCESS_SECRET, '15m')
 │                │                 │──jwt.sign({ userId }, REFRESH_SECRET, '7d')
 │                │                 │──RefreshToken.create({ token, userId, expiresAt })──►│
 │                │◄──{ user, accessToken, refreshToken }──│            │
 │                │──token.setTokens() → localStorage      │            │
 │                │──store.update({ user, tokens })        │            │
 │◄──redirect /project/board──│                            │            │
```

**Password storage:** `$2b$10$...` — prefix `$2b$` là bcrypt, `10` là cost factor, 22 char salt, 31 char hash

## 3.2 ĐĂNG NHẬP VÀ JWT FLOW

**Cấu trúc JWT:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9    ← Header (base64)
.eyJ1c2VySWQiOiI2NjY...IiaWF0IjoxNjk4...}  ← Payload (base64)
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c  ← Signature (HMAC-SHA256)
```

**Flow đầy đủ:**
```
[Login] → POST /api/auth/login
  → verify bcrypt → sign accessToken(15m) + refreshToken(7d)
  → lưu RefreshToken vào MongoDB

[Mỗi request] → JwtInterceptor gắn "Authorization: Bearer <accessToken>"
  → auth.js middleware: jwt.verify(token, ACCESS_SECRET)
  → req.user = await User.findById(decoded.userId)

[Token hết hạn - 401 TOKEN_EXPIRED]
  → JwtInterceptor.handleExpired()
  → POST /api/auth/refresh-token { refreshToken }
  → backend: verify refreshToken + check DB còn tồn tại
  → rotate: xóa token cũ, tạo cặp token mới
  → retry request gốc với accessToken mới

[Logout] → xóa RefreshToken khỏi DB → disconnect Socket.IO
```

**Tại sao cần 2 token:**
- Nếu chỉ dùng 1 token dài hạn → bị lộ thì user phải đổi password mới revoke được
- AccessToken ngắn (15p): bị lộ chỉ có giá trị tối đa 15 phút
- RefreshToken dài (7 ngày) nhưng lưu trong DB → có thể revoke ngay lập tức bằng cách xóa khỏi DB

## 3.3 TẠO PROJECT MỚI

```javascript
// projectController.js
exports.createProject = async (req, res) => {
  const { name, description, startDate, dueDate } = req.body;

  // 1. Tạo Project document
  const project = await Project.create({ name, description, owner: req.user._id, startDate, dueDate });

  // 2. Tự động tạo ProjectMember với role 'owner'
  await ProjectMember.create({ projectId: project._id, user: req.user._id, role: 'owner' });

  res.status(201).json({ project });
};
```

**Lưu ý:** Không tạo Board/Column mặc định tự động. Board được tạo thủ công sau khi có project, hoặc frontend tự tạo khi load project lần đầu.

## 3.4 MỜI THÀNH VIÊN QUA EMAIL

```
Owner/Admin             Backend                    Email Server         Người được mời
    │                     │                              │                    │
    │──POST /api/projects/:id/invitations──►│             │                    │
    │              │──check: email chưa là member        │                    │
    │              │──check: không có pending invitation  │                    │
    │              │──token = crypto.randomUUID()         │                    │
    │              │──expiredAt = now + 48h               │                    │
    │              │──ProjectInvitation.create(...)       │                    │
    │              │──sendInvitationEmail(...)──────►│    │                    │
    │              │                          │──HTML email với 2 nút──►│      │
    │◄──201 "Đã gửi lời mời"                  │                    │    │      │
    │                                         │              [Click Accept]    │
    │                     │◄──GET /invite/accept/:token──────────────────│     │
    │              │──verify token còn hạn    │                               │
    │              │──email === logged-in user.email                          │
    │              │──ProjectMember.create({ projectId, user, role })         │
    │              │──inv.status = 'accepted'                                 │
    │              │──notifService.create() → emit 'notification'             │
    │                     │──────────────────────────────────────────►redirect /project
```

## 3.5 KÉO THẢ TASK (REALTIME)

```
User A (kéo task)         Frontend A                Backend              User B (cùng dự án)
    │                         │                         │                     │
    │──[Kéo card sang cột mới]─►│                        │                     │
    │                 │──CdkDragDrop event               │                     │
    │                 │──moveItemInArray() / transferArrayItem()               │
    │                 │──[PUT /api/tasks/:id/move]──►│   │                     │
    │                 │              │──checkTask middleware                   │
    │                 │              │──checkPermission('canDragTask')         │
    │                 │              │──Validate targetColumnId + newPosition  │
    │                 │              │──Cập nhật positions cột nguồn ($inc -1) │
    │                 │              │──Cập nhật positions cột đích ($inc +1)  │
    │                 │              │──task.columnId = targetColumnId         │
    │                 │              │──task.position = newPosition            │
    │                 │              │──task.save()                            │
    │                 │              │──activityLogger.log('moved', ...)       │
    │                 │◄──{ task }──-│                   │                     │
    │                 │──Update Akita store              │                     │
    │◄──Board re-renders─│           │                   │                     │
    │                   │     [Hiện tại không emit task_moved socket event]    │
    │                   │     [User B cần F5 hoặc có polling để cập nhật]     │
```

**Lưu ý thực tế:** Code hiện tại KHÔNG emit Socket.IO event sau khi move task. Chỉ có `task_deleted` mới emit realtime. Move task cần refresh trang để thấy thay đổi của người khác.

## 3.6 PHÂN QUYỀN CHI TIẾT

**Sơ đồ phân cấp:**
```
Owner (toàn quyền)
  ├── Tạo/xóa project
  ├── Quản lý thành viên (invite, kick, đổi role)
  ├── Đổi trạng thái project
  └── Tất cả quyền Admin + Member

Admin
  ├── Tạo/xóa board, column
  ├── Mời member (không mời admin)
  └── Tất cả quyền Member

Member (mặc định không có gì, có thể được cấp thêm)
  ├── canEditTask    → sửa title, description, priority
  ├── canDragTask    → kéo thả task
  ├── canAssignSelf  → tự gán task cho mình
  └── canAssignOthers → gán task cho người khác
```

**2 lớp kiểm tra quyền:**

*Lớp 1 — Frontend (ẩn UI):*
```typescript
// permission.service.ts
readonly canDragTask$ = combineLatest([this.role$, this._projectQuery.myPermissions$]).pipe(
  map(([r, p]) => r === 'owner' || r === 'admin' || (p?.canDragTask ?? false))
);

// Template
<div [cdkDragDisabled]="!(permissionService.canDragTask$ | async)">
```

*Lớp 2 — Backend (validate API):*
```javascript
// checkPermission.js
module.exports = function checkPermission(permissionKey) {
  return (req, res, next) => {
    const membership = req.membership;
    const isOwnerOrAdmin = ['owner', 'admin'].includes(membership.role);
    if (isOwnerOrAdmin || membership[permissionKey]) return next();
    return res.status(403).json({ message: `No permission: ${permissionKey}` });
  };
};
```

**Tại sao cần kiểm tra cả 2 lớp?**
→ Frontend chỉ ẩn UI nhưng user có thể gọi API trực tiếp bằng curl/Postman. Backend là lớp bảo vệ thực sự, không thể bypass.

## 3.7 THÔNG BÁO REALTIME (SOCKET.IO)

```
Luồng đầy đủ:

[User đăng nhập] → NotificationService.connect()
  → io(wsUrl, { auth: { token } })
  → Server: io.use((socket, next) => jwt.verify(token))
  → socket.join(`user_${userId}`)

[Có sự kiện cần notify - ví dụ: task assigned]
Backend:
  notifService.create({
    recipient: assigneeId,
    type: 'task_assigned',
    title: 'Bạn được giao task',
    body: '"Task ABC" đã được giao cho bạn',
    link: '/project/board',
  })
  → Notification.create() → lưu vào MongoDB
  → _io.to(`user_${recipient}`).emit('notification', notifData)

Frontend (client nhận):
  socket.on('notification', (notif) => {
    this.unreadCount$.next(count + 1);  // badge chuông +1
    this.toast$.next(notif);            // trigger toast popup
  })
  → NotificationToastComponent hiển thị toast
  → NotificationBellComponent cập nhật badge số
```

**Các loại notification:**
`task_assigned`, `task_due_soon`, `task_overdue`, `comment_added`, `member_invited`, `member_joined`, `task_moved`, `task_updated`, `task_deleted`

## 3.8 AI GỢI Ý DEADLINE (GROQ/LLaMA)

```javascript
// Luồng: POST /api/tasks/:taskId/suggest-deadline

// 1. Thu thập context
const completedTasks = await Task.find({ columnId: doneColumnIds, deletedAt: null })
  .limit(15);  // 15 task đã hoàn thành gần nhất

const openTasks = await Task.find({ assignee: task.assignee, columnId: { $nin: doneColumnIds } });
// → workloadCount, highPriorityCount

// 2. Build prompt
const prompt = `Ngày hôm nay: ${today}
Task cần gợi ý: "${task.title}" | Priority: ${task.priority}
Task đã hoàn thành (tham khảo thời gian): ...
Workload assignee: ${workloadCount} task mở
Trả về JSON: { suggestedDeadline, estimatedDays, confidence, reasoning, warnings, alternatives }`;

// 3. Gọi Groq API
const text = await callGroq(SYS_DEADLINE, prompt, true /* json mode */);
return res.json(JSON.parse(text));

// 4. Fallback nếu AI lỗi
catch (aiErr) {
  const fallback = suggestDeadlineRuleBased(task, completedTasks, workloadCount, highPriorityCount);
  // Rule: critical=2d, high=5d, medium=10d, low=14d + workload adjustment
  return res.json({ ...fallback, _fallback: true });
}
```

**Confidence levels:** `high` (có nhiều dữ liệu lịch sử), `medium` (ước tính tương đối), `low` (thiếu dữ liệu)

## 3.9 CRONJOB KIỂM TRA DEADLINE

```javascript
// server.js — 3 cron jobs

// 1. Mỗi giờ: expire invitations quá hạn
setInterval(async () => {
  await ProjectInvitation.updateMany(
    { status: 'pending', expiredAt: { $lt: new Date() } },
    { $set: { status: 'expired' } }
  );
}, 60 * 60 * 1000);

// 2. Mỗi giờ: notify task sắp đến hạn (24h tới) và task quá hạn
setInterval(async () => {
  const dueSoon = await Task.find({ dueDate: { $gte: now, $lte: in24h }, assignee: { $ne: null } });
  for (const task of dueSoon) notifService.create({ type: 'task_due_soon', ... });

  const overdue = await Task.find({ dueDate: { $gte: yesterday, $lt: now }, assignee: { $ne: null } });
  for (const task of overdue) notifService.create({ type: 'task_overdue', ... });
}, 60 * 60 * 1000);

// 3. Mỗi giờ: kiểm tra SLA breach (Workflow Engine)
setInterval(async () => {
  const tasks = await Task.find({ workflowId: { $ne: null }, slaBreached: false });
  for (const task of tasks) {
    if (workflowEngine.isSlaBreach(task, workflow)) {
      task.slaBreached = true; await task.save();
      notifService.create({ type: 'task_updated', title: 'Vi phạm SLA', ... });
    }
  }
}, 60 * 60 * 1000);
```

## 3.10 CHUYỂN ĐỔI NGÔN NGỮ (i18n)

```typescript
// main.ts — cấu hình
bootstrapApplication(AppComponent, {
  providers: [
    { provide: NZ_I18N, useValue: vi_VN },
    provideHttpClient(),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useFactory: HttpLoaderFactory, deps: [HttpClient] }
      })
    )
  ]
});

// HttpLoaderFactory đọc file JSON
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// Template
{{ 'nav.board' | translate }}         // Pipe

// TypeScript
this._translate.instant('error.msg')  // Sync (sau khi loaded)
this._translate.get('key').subscribe() // Async
```

---

# PHẦN 4: CƠ SỞ DỮ LIỆU MONGODB

## 4.1 Tất cả Collections

### 1. `users`
| Field | Type | Mô tả |
|-------|------|--------|
| `_id` | ObjectId | PK tự động |
| `name` | String (required) | Tên hiển thị |
| `email` | String (unique, lowercase) | Email đăng nhập |
| `password` | String (select: false) | bcrypt hash |
| `avatar` | String | URL ảnh đại diện |
| `deletedAt` | Date (null) | Soft delete |
| `createdAt/updatedAt` | Date | Timestamps |

**Index:** `email` unique

### 2. `projects`
| Field | Type | Mô tả |
|-------|------|--------|
| `name` | String (required) | Tên dự án |
| `description` | String | Mô tả |
| `owner` | ObjectId → User | Chủ dự án |
| `startDate/dueDate/endDate` | Date | Ngày |
| `status` | Enum | planning/in_development/testing/released/maintenance/paused/cancelled |
| `version` | String | "1.0.0" |
| `progress` | Number (0-100) | Tiến độ % |
| `techStack` | [String] | Công nghệ dùng |
| `repository/demoUrl` | String | Links |
| `deletedAt` | Date | Soft delete |

### 3. `projectmembers`
| Field | Type | Mô tả |
|-------|------|--------|
| `projectId` | ObjectId → Project | |
| `user` | ObjectId → User | |
| `role` | Enum | owner/admin/member |
| `canEditTask` | Boolean | |
| `canDragTask` | Boolean | |
| `canAssignSelf` | Boolean | |
| `canAssignOthers` | Boolean | |
| `lastAccessedAt` | Date | Lần truy cập gần nhất |

**Index:** `{ projectId: 1, user: 1 }` unique — mỗi user chỉ có 1 membership/project

### 4. `boards`
- `projectId` → Project, `name`, `deletedAt`, timestamps

### 5. `columns`
- `boardId` → Board, `name`, `position` (thứ tự cột), `deletedAt`, timestamps

### 6. `tasks` (model phức tạp nhất)
| Field | Type | Mô tả |
|-------|------|--------|
| `columnId` | ObjectId → Column | Cột hiện tại |
| `boardId` | ObjectId → Board | Board chứa |
| `title` | String (required) | |
| `description` | String | Rich text |
| `assignee` | ObjectId → User | Người thực hiện |
| `priority` | Enum | low/medium/high/critical |
| `dueDate` | Date | Hạn chót |
| `position` | Number | Vị trí trong cột |
| `createdBy` | ObjectId → User | Người tạo |
| `startDate/estimatedHours/actualHours` | | Timeline |
| `progress` | Number (0-100) | % hoàn thành |
| `dependencies` | [ObjectId → Task] | Task phụ thuộc |
| `workflowId` | ObjectId → Workflow | Custom workflow |
| `currentStateId` | String | Trạng thái hiện tại |
| `slaBreached` | Boolean | Đã vi phạm SLA |
| `stateHistory` | [{stateId, enteredAt, exitedAt, durationHours, userId}] | Lịch sử trạng thái |
| `pendingApprovals` | [{transitionId, requesterId, approvers[]}] | Chờ phê duyệt |
| `deletedAt` | Date | Soft delete |

### 7. `comments`
- `taskId` → Task, `user` → User, `content`, `deletedAt`, timestamps

### 8. `activitylogs`
- `taskId` → Task, `user` → User, `action` (created/updated/moved/assigned/commented/deleted), `oldValue`, `newValue`, `createdAt`

### 9. `notifications`
- `recipient` → User, `type`, `title`, `body`, `link`, `isRead`, `meta` (Mixed)
- **Index:** `{ recipient: 1, createdAt: -1 }` — query thông báo của user, mới nhất trước

### 10. `projectinvitations`
- `projectId`, `email`, `invitedBy`, `role`, `token` (unique UUID), `status` (pending/accepted/rejected/expired), `expiredAt`
- **Index:** `{ projectId: 1, email: 1 }`

### 11. `refreshtokens`
- `token` (unique), `userId`, `expiresAt`

### 12. `workflows`
- `projectId`, `name`, `description`, `states[]` (id, name, color, position, isInitial, isFinal, slaHours), `transitions[]` (id, name, fromStateId, toStateId, allowedRoles, allowedUsers, requiredFields, requireApproval, approvers, approvalCount, autoActions[])

### 13. `releases`
- `projectId`, `version`, `releaseDate`, `releaseNotes`, `type` (major/minor/patch/hotfix), `status` (draft/released/rollback), `createdBy`, `tasks[]` → Task, `deletedAt`

## 4.2 Pattern thiết kế

### Embedded Document vs References
- **References (ObjectId):** Dùng khi data dùng độc lập hoặc thường xuyên query riêng
  - `Task.assignee → User` — user là entity độc lập
  - `Task.columnId → Column` — cần biết task thuộc cột nào riêng biệt
- **Embedded:** Dùng khi data chỉ tồn tại trong context của parent
  - `Task.stateHistory[]` — không bao giờ query stateHistory độc lập
  - `Task.pendingApprovals[]` — chỉ có nghĩa khi đọc cùng task
  - `Workflow.states[]` và `Workflow.transitions[]` — chỉ đọc cùng workflow

### Soft Delete Pattern
Tất cả entities quan trọng dùng `deletedAt: null`:
```javascript
// Tự động filter trong mọi query qua Mongoose pre-hook:
schema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});
```
**Lợi ích:** Dữ liệu không mất vĩnh viễn, có thể restore; ActivityLog vẫn tham chiếu đến task cũ

### Timestamps
Tất cả models có `{ timestamps: true }` → MongoDB tự thêm `createdAt` và `updatedAt`

## 4.3 Query phức tạp

### Aggregation Pipeline (trong projectController.js):
```javascript
// Đếm số thành viên mỗi project
const counts = await ProjectMember.aggregate([
  { $match: { projectId: { $in: projectIds } } },
  { $group: { _id: '$projectId', count: { $sum: 1 } } }
]);
```

### Aggregation Pipeline (trong releasesController.js):
```javascript
// Latest release per project
const latestReleases = await Release.aggregate([
  { $match: { projectId: { $in: projectIds }, deletedAt: null } },
  { $sort: { releaseDate: -1 } },
  { $group: { _id: '$projectId', version: { $first: '$version' }, releaseDate: { $first: '$releaseDate' } } },
]);
```

### populate() — tương đương LEFT JOIN:
```javascript
Task.find({ boardId })
  .populate('assignee', 'id name email avatar')  // JOIN với users collection
  .sort({ position: 1 })
```

## 4.4 MongoDB vs PostgreSQL

| Tiêu chí | MongoDB (đã chọn) | PostgreSQL |
|----------|-------------------|------------|
| Schema | Flexible, thêm field không cần migration | Cứng, cần ALTER TABLE |
| Quan hệ | References + populate (manual) | Foreign keys + JOIN (native) |
| Transaction | Hỗ trợ nhưng không dùng trong project | ACID transactions mạnh hơn |
| JSON native | ✅ Document model | ❌ Cần jsonb column |
| Scale horizontal | ✅ Sharding dễ | ❌ Khó hơn |
| Complex queries | ❌ Aggregation cồng kềnh | ✅ SQL mạnh hơn |
| Consistency | Eventual (mặc định) | Strong consistency |

**Tại sao chọn MongoDB cho project này:**
1. Schema task có thể thay đổi (thêm workflow fields, SLA fields) mà không cần migration
2. Prototype nhanh hơn
3. Dữ liệu task tự nhiên là document (nested stateHistory, pendingApprovals)

---

# PHẦN 5: BẢO MẬT

## 5.1 Các lỗ hổng đã phòng tránh

### XSS (Cross-Site Scripting)
- **Angular tự động sanitize** tất cả interpolation `{{ }}` và property binding `[prop]`
- Chỉ `[innerHTML]` mới có thể XSS → không dùng trong project này
- ng-zorro components đã sanitize input

### CSRF (Cross-Site Request Forgery)
- **Dùng JWT thay vì Cookie session** → browser không tự gửi JWT kèm request như cookie
- JWT phải được gắn thủ công trong Authorization header → attacker không thể tạo request hợp lệ từ website khác

### NoSQL Injection
- **Mongoose parameterized queries** — không concat string vào query
- `User.findOne({ email: email })` — safe vì Mongoose escape input
- express-validator validate và normalize input trước khi dùng

### Brute Force
- Không có rate limiting hiện tại (điểm yếu — xem phần 9)
- bcrypt slow hash khiến brute force offline chậm (10 rounds ≈ 100ms/check)

### Password Storage
- **bcryptjs với salt rounds = 10** — mỗi hash bao gồm random salt 22 bytes
- Cùng password → hash khác nhau → rainbow table vô dụng
- Không lưu plain text, không dùng MD5/SHA1/SHA256

### JWT Security
- **ACCESS_TOKEN_SECRET** và **REFRESH_TOKEN_SECRET** từ `.env` — không hardcode
- AccessToken hết hạn sau 15 phút → giới hạn thời gian damage nếu bị lộ
- RefreshToken lưu trong DB → có thể revoke ngay lập tức
- Logout xóa RefreshToken khỏi DB + disconnect Socket.IO

### CORS
```javascript
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:4200', credentials: true }));
```
Chỉ allow origin cụ thể, không `origin: '*'`

### HTTP Security Headers
`swagger-ui-express` và Express mặc định có một số headers. Dự án chưa dùng `helmet` đầy đủ (điểm yếu).

## 5.2 Xác thực và phân quyền 2 tầng

```
Request
  │
  ▼
[auth.js middleware]
  → Verify JWT signature
  → Check token expiry
  → Load user from DB
  → req.user = user
  │
  ▼
[checkTask.js middleware]
  → Load task by :id
  → Find ProjectMember (task → board → project → member)
  → req.task = task
  → req.membership = membership
  │
  ▼
[checkPermission('canDragTask') middleware]
  → if owner/admin → pass
  → else if membership.canDragTask → pass
  → else → 403 Forbidden
  │
  ▼
[Controller]
  → Business logic (đã an toàn)
```

**Frontend Route Guards:**
```typescript
// auth.guard.ts
canActivate(): boolean {
  if (this._token.getAccessToken()) return true;
  this._router.navigate(['/login']);
  return false;
}

// Áp dụng cho toàn bộ /project/* routes
{ path: 'project', canActivate: [AuthGuard], loadChildren: ... }
```

---

# PHẦN 6: API DOCUMENTATION

## Auth APIs (`/api/auth`)

| Method | URL | Auth | Mô tả |
|--------|-----|------|--------|
| POST | `/register` | ❌ | Đăng ký — body: `{name, email, password}` |
| POST | `/login` | ❌ | Đăng nhập — body: `{email, password}` |
| POST | `/logout` | ❌ | Đăng xuất — body: `{refreshToken}` |
| POST | `/refresh-token` | ❌ | Lấy token mới — body: `{refreshToken}` |
| GET  | `/me` | ✅ | Thông tin user hiện tại |
| PUT  | `/profile` | ✅ | Cập nhật profile — body: `{name, avatar}` |
| PUT  | `/change-password` | ✅ | Đổi mật khẩu — body: `{oldPassword, newPassword}` |

## Project APIs (`/api/projects`)

| Method | URL | Auth | Permission | Mô tả |
|--------|-----|------|------------|--------|
| GET | `/` | ✅ | Member+ | Lấy danh sách project của user |
| GET | `/my-projects` | ✅ | Member+ | Projects với memberCount |
| GET | `/search?q=` | ✅ | Member+ | Tìm kiếm project |
| POST | `/` | ✅ | Any | Tạo project mới |
| GET | `/:id` | ✅ | Member+ | Chi tiết project |
| PUT | `/:id` | ✅ | Owner/Admin | Cập nhật project |
| DELETE | `/:id` | ✅ | Owner | Xóa project |
| GET | `/:id/invitations` | ✅ | Owner/Admin | Danh sách lời mời |
| POST | `/:id/invitations` | ✅ | Owner/Admin | Mời thành viên |
| DELETE | `/:id/invitations/:invId` | ✅ | Owner/Admin | Hủy lời mời |
| GET | `/:id/members` | ✅ | Member+ | Danh sách thành viên |
| PUT | `/:id/members/:userId` | ✅ | Owner/Admin | Cập nhật quyền |
| DELETE | `/:id/members/:userId` | ✅ | Owner | Kick member |

## Task APIs

| Method | URL | Auth | Permission | Mô tả |
|--------|-----|------|------------|--------|
| GET | `/api/boards/:boardId/tasks` | ✅ | Member+ | Lấy tất cả tasks (grouped by column) |
| GET | `/api/columns/:colId/tasks` | ✅ | Member+ | Tasks của 1 cột |
| POST | `/api/columns/:colId/tasks` | ✅ | Owner/Admin | Tạo task mới |
| GET | `/api/tasks/:id` | ✅ | Member+ | Chi tiết task |
| PUT | `/api/tasks/:id` | ✅ | canEditTask | Cập nhật task |
| DELETE | `/api/tasks/:id` | ✅ | Owner/Admin hoặc createdBy | Xóa task |
| PUT | `/api/tasks/:id/move` | ✅ | canDragTask | Di chuyển task |
| POST | `/api/tasks/:id/suggest-deadline` | ✅ | canEditTask | AI gợi ý deadline |
| GET | `/api/tasks/:id/comments` | ✅ | Member+ | Bình luận |
| POST | `/api/tasks/:id/comments` | ✅ | Member+ | Thêm bình luận |
| GET | `/api/tasks/:id/activities` | ✅ | Member+ | Lịch sử hoạt động |

## Notification APIs

| Method | URL | Mô tả |
|--------|-----|--------|
| GET | `/api/notifications?page=&limit=&unread=` | Danh sách thông báo |
| GET | `/api/notifications/unread-count` | Số thông báo chưa đọc |
| PUT | `/api/notifications/:id/read` | Đánh dấu đã đọc |
| PUT | `/api/notifications/read-all` | Đánh dấu tất cả đã đọc |
| DELETE | `/api/notifications/:id` | Xóa thông báo |

## AI APIs (`/api/projects/:id/ai`)

| Method | URL | Mô tả |
|--------|-----|--------|
| GET | `/summary` | Phân tích tiến độ dự án |
| GET | `/statistics` | Thống kê task theo cột/người/priority |
| POST | `/predict` | Dự đoán hoàn thành đúng hạn |
| POST | `/report` | Tạo báo cáo Markdown |
| POST | `/api/tasks/:id/suggest-deadline` | Gợi ý deadline cho task |

## Workflow APIs

| Method | URL | Mô tả |
|--------|-----|--------|
| GET/POST | `/api/projects/:id/workflows` | List + Tạo workflow |
| GET/PUT/DELETE | `/api/workflows/:id` | CRUD workflow |
| POST | `/api/workflows/:id/clone` | Sao chép workflow |
| POST | `/api/workflows/:id/validate` | Validate cấu trúc |
| POST | `/api/workflows/:id/analyze` | AI phân tích bottleneck |
| GET | `/api/tasks/:id/workflow` | Lấy available transitions |
| POST | `/api/tasks/:id/workflow/transition` | Thực hiện transition |
| POST | `/api/tasks/:id/workflow/approve` | Phê duyệt/từ chối |
| GET | `/api/tasks/:id/workflow/history` | Lịch sử trạng thái |

## Releases APIs

| Method | URL | Mô tả |
|--------|-----|--------|
| GET | `/api/releases/overview` | Tổng quan tất cả dự án |
| GET | `/api/releases/timeline` | Timeline tất cả releases |
| GET | `/api/releases/statistics` | Thống kê releases |
| PUT | `/api/releases/:id` | Cập nhật release notes |
| GET | `/api/projects/:id/releases` | Releases của 1 dự án |
| POST | `/api/projects/:id/releases` | Tạo release mới |
| POST | `/api/projects/:id/status` | Đổi trạng thái dự án |
| GET | `/api/projects/:id/suggest-version` | Gợi ý version tiếp theo |

## Timeline APIs

| Method | URL | Mô tả |
|--------|-----|--------|
| GET | `/api/timeline` | Gantt data đa dự án |

---

# PHẦN 7: CÂU HỎI HỘI ĐỒNG THƯỜNG GẶP

## 7.1 Câu hỏi về Công nghệ

**Q1: Tại sao chọn Angular thay vì React hay Vue?**
> Angular phù hợp hơn cho dự án enterprise-scale vì kiến trúc rõ ràng (MVC-like), TypeScript native, dependency injection mạnh, Angular Router + Guards + Interceptors đầy đủ. React linh hoạt hơn nhưng cần chọn thêm nhiều thư viện (Redux, React Router...) và không có opinioned architecture. Vue nhẹ hơn nhưng ecosystem nhỏ hơn Angular cho enterprise app.

**Q2: Tại sao dùng Express thay vì NestJS?**
> Express đơn giản, nhẹ, không over-engineering cho quy mô dự án. NestJS có thêm Decorators, Modules, Pipes, Guards... nhiều abstraction không cần thiết. Thời gian học Express ngắn hơn, documentation rõ ràng. Nếu dự án scale lên microservices thì NestJS sẽ tốt hơn.

**Q3: Tại sao MongoDB thay vì PostgreSQL?**
> Schema Task rất linh hoạt (có workflow fields, stateHistory embedded, pendingApprovals...) — nếu dùng SQL cần rất nhiều bảng và JOIN phức tạp. MongoDB document model tự nhiên hơn với dữ liệu hierarchical. Tuy nhiên MongoDB yếu hơn ở ACID transactions và complex JOIN queries.

**Q4: Tại sao Socket.IO thay vì WebSocket thuần?**
> Socket.IO có auto-reconnection, fallback to long-polling khi WebSocket bị chặn (firewall), room/namespace management, authentication middleware dễ implement. WebSocket thuần nhẹ hơn nhưng phải tự implement những feature đó.

**Q5: Tại sao JWT thay vì Session?**
> JWT là stateless — server không cần lưu session state, horizontal scaling dễ hơn (không cần shared session store). Session cần server lưu trữ session data, phức tạp khi scale. Tuy nhiên JWT không thể revoke ngay lập tức (trừ khi implement blacklist) — giải quyết bằng cách dùng AccessToken ngắn hạn.

**Q6: Tại sao bcrypt thay vì SHA-256?**
> bcrypt được thiết kế cho hashing password, có adaptive cost factor (chậm cố ý để brute force khó). SHA-256 là general-purpose hash, rất nhanh → dễ brute force (hàng tỷ hash/giây với GPU). bcrypt tự tích hợp salt nên cùng password có hash khác nhau mỗi lần.

**Q7: AI thực tế dùng gì?**
> Dùng **Groq API** với model `llama-3.3-70b-versatile` (không phải Gemini). Groq có free tier với rate limit cao, phản hồi cực nhanh do dùng LPU chip. Có fallback rule-based khi API không khả dụng.

**Q8: Tại sao dùng Akita thay vì NgRx?**
> Akita ít boilerplate hơn NgRx nhiều. NgRx cần định nghĩa actions, reducers, effects, selectors riêng biệt. Akita đơn giản hơn: Store (state) + Query (selectors) + Service (updaters). Cho dự án vừa, Akita đủ mạnh và code gọn hơn.

**Q9: Tailwind CSS dùng như thế nào?**
> Dùng kết hợp với SCSS component. Một số component dùng Tailwind utility classes (`text-xl`, `flex`, `gap-2`) cho quick styling, phần còn lại dùng SCSS với BEM-like naming.

**Q10: Soft delete là gì và tại sao dùng?**
> Thay vì xóa record khỏi DB, đặt `deletedAt = new Date()`. Mongoose pre-hook tự filter `{ deletedAt: null }` trong mọi query. Ưu điểm: khôi phục dữ liệu được, ActivityLog không bị orphan, audit trail còn nguyên.

## 7.2 Câu hỏi về Kiến trúc

**Q11: Em mô tả kiến trúc 3 tầng trong dự án?**
> Tầng 1 — Presentation: Angular SPA chạy trên browser, chỉ biết về UI và gọi API. Tầng 2 — Application: Express server xử lý business logic, authentication, authorization, Socket.IO real-time. Tầng 3 — Data: MongoDB lưu trữ dữ liệu qua Mongoose ODM. 3 tầng độc lập, thay đổi DB không ảnh hưởng Angular code.

**Q12: Mô hình MVC hoạt động thế nào trong dự án?**
> Backend: Model = Mongoose schemas, View = JSON responses (không có template), Controller = xử lý business logic trong controllers/. Frontend cũng có dạng MVC: Component = View + Controller, Service = Model (gọi API và quản lý state).

**Q13: Em có thể mở rộng sang microservices không?**
> Có thể. Hiện tại monolith nhưng đã tách biệt rõ: auth module, project module, task module, notification module, AI module, workflow module. Có thể tách từng module thành service riêng với API gateway. Cần thêm: message queue (RabbitMQ/Kafka) cho async events, service discovery, distributed tracing.

**Q14: Xử lý concurrency khi 2 người cùng kéo 1 task thế nào?**
> Hiện tại không có optimistic locking. API cuối cùng được xử lý sẽ thắng (last-write-wins). Hướng cải thiện: dùng MongoDB findOneAndUpdate với version field, hoặc optimistic concurrency control với `__v` field của Mongoose.

**Q15: MongoDB có hỗ trợ transaction không?**
> Có — MongoDB hỗ trợ multi-document ACID transactions từ v4.0 (replica set) và v4.2 (sharded cluster). Tuy nhiên dự án này chưa dùng session/transaction vì chạy trên standalone MongoDB. Hướng cải thiện: dùng `mongoose.startSession()` cho các operations cần atomicity như move task.

## 7.3 Câu hỏi về Bảo mật

**Q16: JWT có an toàn không?**
> An toàn nếu implement đúng: dùng strong secret key, AccessToken ngắn hạn (15 phút), RefreshToken lưu DB (có thể revoke), không lưu sensitive data trong payload. Điểm yếu: nếu AccessToken bị lộ trong 15 phút kẻ tấn công có thể dùng. Giải quyết bằng HTTPS + không log token.

**Q17: Nếu RefreshToken bị lộ thì sao?**
> Dùng refresh token rotation: mỗi lần dùng RefreshToken → tạo cặp token mới, xóa token cũ. Nếu kẻ tấn công dùng RefreshToken trước user hợp lệ → user cần đăng nhập lại (token đã bị consume). Có thể thêm: detect token reuse, invalidate toàn bộ session của user đó.

**Q18: Em chống XSS bằng cách nào?**
> Angular tự động escape tất cả interpolation `{{ }}` và property binding `[prop]`. Chỉ `[innerHTML]` mới bypass — project không dùng. ng-zorro components cũng sanitize. Với rich text (description dùng Quill editor), content được sanitize trước khi lưu.

**Q19: Mật khẩu được lưu thế nào?**
> `bcrypt.hash(password, SALT_ROUNDS=10)` → tạo hash dạng `$2b$10$<22-char-salt><31-char-hash>`. Không bao giờ lưu plain text. Khi verify: `bcrypt.compare(inputPassword, storedHash)` → bcrypt extract salt từ hash, hash lại input, so sánh.

**Q20: Em chống brute force login thế nào?**
> Hiện tại chưa có rate limiting (điểm yếu). bcrypt chậm (10 rounds) làm chậm brute force. Hướng cải thiện: `express-rate-limit` middleware, account lockout sau N lần sai, CAPTCHA.

## 7.4 Câu hỏi về Tính năng

**Q21: Cơ chế phân quyền 2 cấp hoạt động thế nào?**
> Cấp 1 — Role: owner/admin/member. owner và admin tự động có tất cả quyền. Cấp 2 — Permission bits: member có thể được cấp thêm `canEditTask`, `canDragTask`, `canAssignSelf`, `canAssignOthers`. Kiểm tra 2 lớp: Frontend ẩn UI dựa trên Observable permission streams; Backend middleware `checkPermission()` verify mọi API call.

**Q22: Realtime notification đảm bảo không mất tin nhắn không?**
> Notification được lưu vào MongoDB TRƯỚC khi emit Socket.IO. Nếu user offline khi emit → notification vẫn có trong DB → khi user online gọi `GET /notifications` sẽ thấy. Badge số được fetch từ API mỗi khi kết nối lại.

**Q23: AI gợi ý deadline dựa trên dữ liệu gì?**
> 4 yếu tố: (1) Thông tin task hiện tại (title, priority, description), (2) 15 task đã hoàn thành gần nhất (làm benchmark thời gian), (3) Workload hiện tại của assignee (số task đang mở), (4) Số task high/critical đang mở. Nếu AI không khả dụng: rule-based với base days theo priority (critical=2, high=5, medium=10, low=14) + điều chỉnh theo workload.

**Q24: Nếu Groq/AI trả lời sai thì sao?**
> Hệ thống có `confidence` level (high/medium/low) để user biết độ tin cậy. AI chỉ GỢI Ý, không tự động áp deadline — user phải click confirm. Có `alternatives` với lạc quan/thận trọng. Kết quả AI luôn kèm `reasoning` giải thích tại sao.

**Q25: Kéo thả task khi 2 người cùng kéo 1 task thì sao?**
> Không có lock mechanism. API last-write-wins: request đến sau sẽ override. Hướng giải quyết: optimistic locking (versionKey), hoặc emit socket event sau khi move để client khác cập nhật real-time (chưa implement).

**Q26: Workflow Engine hoạt động thế nào?**
> State machine: mỗi task có `currentStateId`. Chỉ có thể transition theo `transitions` định nghĩa sẵn (fromStateId → toStateId). Kiểm tra: user có trong `allowedRoles` hoặc `allowedUsers`. Nếu `requireApproval=true`: tạo `pendingApproval` entry, đợi đủ `approvalCount` approvers phê duyệt. SLA: mỗi state có `slaHours`, cron job kiểm tra breach hàng giờ.

**Q27: Gantt chart hoạt động thế nào?**
> Dùng thư viện `frappe-gantt`. Backend `/api/timeline` trả về tasks có `startDate` và `dueDate` từ tất cả projects user tham gia. Frontend map thành Gantt tasks format: `{ id, name, start, end, progress, dependencies }`. Render SVG-based Gantt chart.

## 7.5 Câu hỏi về Hiệu năng

**Q28: Em đã tối ưu performance ở những đâu?**
> (1) MongoDB indexes: `{ recipient: 1, createdAt: -1 }` cho notifications, `{ projectId: 1, user: 1 }` unique cho project members; (2) `populate()` chỉ select fields cần thiết `'id name email avatar'`; (3) Pagination: `/api/notifications?page=&limit=20`; (4) Angular ChangeDetectionStrategy.OnPush cho các component nặng; (5) Lazy loading Angular routes.

**Q29: Nếu có 1000 user đồng thời thì sao?**
> Node.js event loop single-threaded nhưng non-blocking I/O xử lý nhiều connection concurrent. Socket.IO có thể handle 1000 connections. Bottleneck có thể ở MongoDB queries. Cải thiện: Redis caching, MongoDB connection pooling (Mongoose default có pool), horizontal scaling với PM2 cluster + sticky session.

**Q30: Em dùng cache không?**
> Hiện tại không có cache. Hướng cải thiện: Redis cache cho project list (thay đổi ít), user profile, AI results. Frontend có browser cache cho i18n JSON files và static assets.

**Q31: Frontend có lazy load không?**
> Có. `app.routes.ts` dùng `loadChildren(() => import(...))` cho module `/project` — chỉ load khi user navigate đến. Login page và invite pages load ngay.

## 7.6 Câu hỏi về Testing

**Q32: Em có viết unit test không?**
> Project có setup Vitest (package.json: `"test": "vitest run"`) và có một số spec files nhưng chưa hoàn chỉnh. Đây là hướng phát triển tiếp theo. Trong quá trình develop, em test thủ công qua browser và Swagger UI `/api/docs`.

**Q33: Em test như thế nào khi làm 1 mình?**
> Test thủ công từng chức năng theo luồng user journey. Dùng Swagger UI cho backend API testing. Mở 2 browser tabs với 2 tài khoản khác nhau để test realtime notification. Test edge cases: token hết hạn, không có quyền, input rỗng...

**Q34: Em có dùng Postman không?**
> Chủ yếu dùng Swagger UI tích hợp tại `/api/docs` và test trực tiếp qua browser. Postman dùng cho một số API phức tạp.

## 7.7 Câu hỏi về Triển khai

**Q35: Em đã deploy lên cloud chưa?**
> Chưa deploy production. Đang chạy local development. Đã chuẩn bị `.env` configuration và đủ điều kiện để deploy.

**Q36: Nếu deploy lên cloud thì cần gì?**
> (1) Backend: Node.js hosting (Railway, Render, AWS EC2); (2) Database: MongoDB Atlas cloud; (3) Frontend: Static hosting (Vercel, Netlify, Firebase Hosting sau `ng build`); (4) Environment variables: JWT secrets, MongoDB URI, Groq API key, Gmail SMTP; (5) CORS update cho production domain; (6) HTTPS certificate.

**Q37: Em có Docker hóa không?**
> Chưa, nhưng để Docker hóa cần: `Dockerfile` cho backend (FROM node:18), `Dockerfile` cho frontend build, `docker-compose.yml` orchestrate backend + mongodb. Docker giúp environment consistent giữa dev và production.

**Q38: CI/CD em làm thế nào?**
> Chưa có CI/CD. Hướng: GitHub Actions workflow — khi push to main: lint → test → build → deploy. Frontend build `ng build --configuration production`, backend test `npm test`.

## 7.8 Câu hỏi mẹo/bẫy

**Q39: Em đã dùng AI (Claude/ChatGPT) để hỗ trợ coding không?**
> Có, em dùng AI như một công cụ hỗ trợ — tương tự như dùng Stack Overflow hay documentation. AI giúp em viết code nhanh hơn, nhưng em hiểu và review tất cả code trước khi đưa vào project. Em có thể giải thích bất kỳ đoạn code nào trong project vì em đã đọc và chỉnh sửa chúng theo yêu cầu thực tế.

**Q40: Nếu thầy/cô chỉ vào dòng code bất kỳ và hỏi, em giải thích được không?**
> Dạ có. Em đã đọc toàn bộ source code và hiểu flow từ frontend đến backend. Hãy chỉ bất kỳ file nào.

**Q41: Em mất bao lâu để làm?**
> Khoảng [X] tháng làm việc song song với học tập. Giai đoạn đầu thiết kế database schema và API, giai đoạn giữa implement core features (auth, kanban, realtime), giai đoạn cuối thêm AI, workflow engine, và releases.

**Q42: Nếu làm lại, em sẽ thay đổi gì?**
> (1) Thêm unit tests từ đầu; (2) Implement optimistic locking cho concurrent task editing; (3) Dùng TypeScript trên cả backend (chuyển sang NestJS hoặc Express + ts-node); (4) Thêm rate limiting và helmet từ đầu; (5) Setup CI/CD sớm hơn.

**Q43: Em hiểu Akita là gì không?**
> Akita là state management library dựa trên RxJS. Dùng pattern Store (nơi lưu state) + Query (reactive selectors) + Service (update state). Tương tự Redux nhưng ít boilerplate hơn nhiều. Em dùng để quản lý project state (issues, columns, users, permissions) — khi state thay đổi, tất cả components subscribe tự động re-render.

**Q44: Tại sao không dùng Angular Signals thay vì RxJS/Akita?**
> Angular Signals là tính năng mới từ Angular 16+, tốt cho simple reactive state. Akita + RxJS mạnh hơn cho complex async flows (multiple API calls, Socket.IO events, permission combinations). Signals và Observables có thể dùng cùng nhau — `toSignal()` và `toObservable()`.

**Q45: Explain JWT flow khi token hết hạn?**
> JwtInterceptor bắt lỗi 401 với code `TOKEN_EXPIRED`. Nếu đang có request khác refresh, queue vào BehaviorSubject. Nếu chưa refresh, gọi `/auth/refresh-token` với refreshToken từ localStorage. Server verify refreshToken trong DB → tạo token mới → rotate (xóa cũ, tạo mới). Client lưu token mới, retry tất cả queued requests. Nếu refresh fail (token expired/invalid) → logout.

---

## 7.9 Câu hỏi sâu về kỹ thuật

**Q46: Mongoose pre-hook soft delete hoạt động thế nào?**
```javascript
schema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});
```
> Regex `/^find/` match tất cả methods: `find`, `findOne`, `findById`, `findOneAndUpdate`... Trước khi chạy query, tự động thêm `{ deletedAt: null }` condition. Nếu query đã có `deletedAt` (ví dụ để tìm deleted records) → không add thêm.

**Q47: `BehaviorSubject` vs `Subject` trong RxJS khác nhau thế nào?**
> `BehaviorSubject` có initial value và replay giá trị cuối cùng cho subscribers mới. `Subject` không có initial value và không replay. Em dùng `BehaviorSubject<number>(0)` cho `unreadCount$` vì component subscribe sau vẫn cần giá trị hiện tại. Dùng `Subject` cho `toast$` và `taskDeleted$` vì chỉ quan tâm events mới, không cần replay.

**Q48: Angular ChangeDetection.OnPush hoạt động thế nào?**
> Mặc định Angular check tất cả components sau mỗi event. OnPush chỉ check khi: Input reference thay đổi, Observable emit (với async pipe), `markForCheck()` được gọi. Giảm số lần re-render → performance tốt hơn. Em dùng trong các component nặng như `IssueWorkflowSectionComponent`.

**Q49: Mongoose `populate()` là gì?**
> Là cách thực hiện JOIN equivalent trong MongoDB. Thay vì chỉ lưu ObjectId, `populate()` tự động fetch document từ collection khác. Ví dụ: `Task.find().populate('assignee', 'id name email')` → thay ObjectId của assignee bằng user object đầy đủ. Thực ra là 2 queries riêng biệt (không phải true JOIN).

**Q50: Token rotation là gì và tại sao dùng?**
> Mỗi khi dùng RefreshToken → xóa token cũ → tạo cặp token mới. Nếu kẻ tấn công có RefreshToken và dùng trước user hợp lệ → token bị consume, user hợp lệ gọi refresh sẽ fail → phát hiện breach → invalidate tất cả sessions. Prevents refresh token reuse attacks.

---

# PHẦN 8: DEMO SCRIPT

## 8.1 Chuẩn bị trước demo (15 phút trước)

```
✅ Khởi động backend:   cd backend && npm start
✅ Khởi động frontend:  cd frontend && npm start  
✅ Mở MongoDB Compass:  localhost:27017/task_manager
✅ Mở 2 browser windows:
   - Window 1 (Chrome): tài khoản Admin/Owner
   - Window 2 (Firefox/Incognito): tài khoản Member

✅ Đã có sẵn dữ liệu mẫu:
   - 2-3 projects với tasks
   - Ít nhất 2 user accounts
   - Một số tasks có dueDate sắp đến hạn

✅ Màn hình chuẩn bị: VS Code mở source code để tham chiếu
```

## 8.2 Kịch bản demo 15 phút

### Phút 1-2: Giới thiệu + Đăng nhập
```
"Đây là hệ thống Quản lý Dự án và Công việc — tương tự Jira, được xây dựng 
với Angular 20 ở frontend và Node.js/Express ở backend, sử dụng MongoDB 
làm database và Socket.IO cho real-time communication."

[Demo đăng nhập với tài khoản Account 1]
→ Highlight: form validation, loading state
→ Sau đăng nhập: chuyển về /project/board

"Hệ thống dùng JWT Authentication — access token 15 phút, refresh token 7 ngày.
Token được tự động refresh trong nền khi hết hạn."
```

### Phút 3-5: Kanban Board + Kéo thả
```
[Mở trang Board]
"Đây là Kanban board với 4 cột mặc định. User có thể thêm cột mới."

[Demo tạo task mới]
→ Click + trong cột To Do
→ Nhập title, chọn priority, gán assignee, chọn deadline
"Task được tạo với position tự động, gán vào cuối cột."

[Demo kéo thả task sang In Progress]
→ Dùng Angular CDK DragDrop
"Khi kéo thả, frontend gọi PUT /api/tasks/:id/move
Backend tự động cập nhật position của tất cả tasks liên quan trong cột."

[Highlight checkPermission]
"Hệ thống kiểm tra quyền canDragTask ở CẢ 2 lớp:
Frontend ẩn drag handle nếu không có quyền,
Backend từ chối API nếu gọi trực tiếp."
```

### Phút 6-7: Chi tiết task + AI
```
[Click vào một task để xem detail]
→ Mở issue detail drawer
"Tại đây có đầy đủ: mô tả (rich text), assignee, priority, deadline,
activity log (ai làm gì với task này), bình luận."

[Demo AI gợi ý deadline]
→ Click "Gợi ý thời gian" button
"AI phân tích: priority của task, 15 task đã hoàn thành gần nhất làm benchmark,
workload hiện tại của người được giao."
→ Hiển thị kết quả: suggested date, confidence level, reasoning, alternatives
```

### Phút 8-10: Realtime Notification
```
[Mở Window 2 — Account Member]
"Tôi sẽ demo real-time notification. Đây là tài khoản Member."

[Window 1 — gán task cho Member account]
→ Trong task detail, đổi assignee sang Member account

[Window 2 — hiện notification toast]
"Notification xuất hiện real-time không cần refresh trang.
Socket.IO duy trì WebSocket connection. Badge số chuông tăng lên."

[Window 2 — mở notification list]
→ Xem danh sách thông báo, đánh dấu đã đọc
```

### Phút 11-12: Mời thành viên qua Email
```
[Settings > Members]
"Phân quyền 3 cấp: Owner, Admin, Member.
Admin có thể mời Member; chỉ Owner mới mời được Admin."

[Demo invite flow — nếu email đã setup]
→ Nhập email, chọn role, click Mời
"Hệ thống tạo UUID token, lưu vào DB với expiry 48h,
gửi email HTML qua Nodemailer với nút Accept/Reject."
```

### Phút 13: Trang Releases + Timeline
```
[Click icon Rocket → trang Releases]
"Trang Releases tổng quan tất cả dự án của user:
trạng thái, phiên bản, tiến độ, tech stack.
Owner có thể tạo release mới với version suggestion tự động."

[Click icon Calendar → Timeline]
"Gantt chart đa dự án dùng frappe-gantt library.
Hiển thị tasks có startDate và dueDate."
```

### Phút 14-15: i18n + Kết
```
[Demo đổi ngôn ngữ]
→ Click language switcher
"Hệ thống hỗ trợ tiếng Việt và English.
ngx-translate load file JSON từ assets/i18n/ và pipe translate."

[Kết thúc]
"Đó là demo các chức năng chính. Hệ thống còn có:
Custom Workflow Engine với state machine và SLA monitoring,
AI phân tích bottleneck, Swagger API documentation tại /api/docs."
```

## 8.3 Câu mở đầu
> *"Thưa hội đồng, em xin trình bày đồ án 'Hệ thống Quản lý Dự án và Công việc'. Hệ thống được xây dựng theo kiến trúc Client-Server 3 tầng, sử dụng Angular 20 cho frontend, Node.js/Express cho backend, và MongoDB làm database. Em xin phép bắt đầu demo."*

## 8.4 Câu kết thúc
> *"Đó là toàn bộ các chức năng chính của hệ thống. Hệ thống gồm hơn 40 API endpoints, 13 MongoDB collections, và real-time communication qua Socket.IO. Em xin sẵn sàng trả lời câu hỏi của hội đồng."*

---

# PHẦN 9: ĐIỂM YẾU VÀ CÁCH TRẢ LỜI

| Điểm yếu | Thực tế | Cách trả lời khéo |
|----------|---------|-------------------|
| Chưa có unit test | Có setup Vitest nhưng chưa viết test | *"Trong quá trình phát triển em test thủ công qua browser và Swagger UI. Unit test với Vitest là hướng phát triển tiếp theo em đã lên kế hoạch."* |
| Chưa deploy production | Chạy local | *"Em đã chuẩn bị đầy đủ environment configuration và kiến trúc sẵn sàng để deploy lên Railway/Render cho backend và Vercel cho frontend. Demo hôm nay chạy trên localhost."* |
| Không có rate limiting | Express-rate-limit chưa tích hợp | *"Đây là điểm em nhận ra sau khi hoàn thiện core features. Em đã nghiên cứu express-rate-limit và đây là bước tiếp theo để hardening bảo mật."* |
| Không có Helmet.js | | *"Helmet.js bảo vệ HTTP headers (X-Frame-Options, Content-Security-Policy...). Em đã biết về nó nhưng chưa tích hợp kịp — đây là improvement tiếp theo."* |
| Task move không realtime | Chỉ task_deleted có socket event | *"Move task hiện tại chỉ update cho user thực hiện. Để realtime hoàn toàn, cần emit socket event `task_moved` sau khi save — đây là cải tiến em sẽ thêm."* |
| Không có mobile app | Angular web app | *"Frontend Angular responsive, có thể truy cập tốt trên mobile browser. Native mobile app (React Native/Flutter) là hướng mở rộng trong tương lai."* |
| AI đôi khi trả lời sai | | *"Hệ thống AI chỉ gợi ý, không tự động áp dụng. User luôn là người quyết định cuối. Confidence level giúp user biết mức độ tin cậy. Có fallback rule-based khi AI không khả dụng."* |
| Chưa có CI/CD | Chưa setup GitHub Actions | *"Em đã quen với Git workflow (commit, branch). CI/CD với GitHub Actions là bước tiếp theo để tự động hóa build và deploy."* |
| Không có HTTPS local | Chạy HTTP localhost | *"Production deployment sẽ dùng HTTPS. Groq/Socket.IO đều hoạt động tốt với HTTPS. Local development dùng HTTP là tiêu chuẩn."* |

---

# PHẦN 10: GHI CHÚ QUAN TRỌNG

## 10.1 Những điều TUYỆT ĐỐI KHÔNG nói

❌ **"Em copy từ ChatGPT/Claude toàn bộ"**
→ Thay bằng: *"Em dùng AI như một công cụ hỗ trợ, tương tự dùng documentation hay Stack Overflow. Em hiểu và chịu trách nhiệm với tất cả code."*

❌ **"Em không biết phần này"**
→ Thay bằng: *"Phần này em chưa nghiên cứu sâu, nhưng em hiểu nguyên lý cơ bản là..."*

❌ **"Em làm không kịp nên thiếu..."**
→ Thay bằng: *"Em ưu tiên implement các chức năng core trước, phần đó là hướng phát triển tiếp theo."*

❌ **"Em không hiểu tại sao nó chạy được"**

## 10.2 Câu trả lời an toàn

✅ *"Dạ thưa thầy/cô, phần này em chưa nghiên cứu đủ sâu, nhưng theo hiểu biết của em thì... Em sẽ tìm hiểu thêm ạ."*

✅ *"Đây là trade-off em đã cân nhắc: [A] có ưu điểm X nhưng nhược điểm Y, [B] ngược lại. Em chọn [A] vì Z phù hợp với yêu cầu dự án."*

✅ *"Đây là hướng phát triển tiếp theo nếu có thêm thời gian."*

✅ *"Em hiểu câu hỏi là..., theo em thì câu trả lời là... Nếu thầy/cô thấy chưa đúng em xin được bổ sung thêm ạ."*

## 10.3 Body language và presentation

- **Đứng thẳng, nhìn thẳng vào hội đồng** khi trả lời, không nhìn xuống
- **Nói chậm, rõ ràng** — hội đồng cần hiểu, không cần nói nhanh
- **Tránh "à, ờ, ừm"** — nếu cần suy nghĩ: "Dạ để em suy nghĩ một chút ạ"
- **Khi demo:** mô tả to những gì đang làm — *"Tôi đang click vào đây để..."*
- **Khi bị hỏi khó:** Không nói "không biết" ngay — thử nói những gì mình biết về chủ đề đó

## 10.4 Số liệu thực tế để trích dẫn

| Thống kê | Số liệu |
|----------|---------|
| Collections MongoDB | 13 |
| API Endpoints | ~45+ |
| Backend files (controllers + routes + models + services) | ~65 JS files |
| Frontend components + services | ~90+ TS files |
| Frontend pages | 8 trang chính |
| i18n keys | ~200+ |
| Loại notification | 9 types |
| JWT AccessToken expiry | 15 phút |
| JWT RefreshToken expiry | 7 ngày |
| Invitation expiry | 48 giờ |
| AI model | llama-3.3-70b-versatile (Groq) |
| Cron jobs | 3 jobs (invitation expiry, deadline notify, SLA check) |
| Loại permission | 4 (canEditTask, canDragTask, canAssignSelf, canAssignOthers) |
| Roles | 3 (owner, admin, member) |

## 10.5 Câu hỏi ngược lại hội đồng (khi được hỏi thêm)

*"Thưa thầy/cô, theo góc nhìn của thầy/cô, hướng nào em nên ưu tiên cải thiện trước ạ?"*

*"Thầy/cô có thể gợi ý thêm về cách implement [feature X] hiệu quả hơn không ạ?"*

---

## TỔNG KẾT

| Hạng mục | Số liệu |
|----------|---------|
| Tổng số câu hỏi đã chuẩn bị | **65 câu** |
| Phần quan trọng cần ôn kỹ nhất | Phần 3 (Luồng nghiệp vụ) + Phần 7 (Q&A) |
| File cần mở sẵn khi demo | `server.js`, `authController.js`, `taskController.js`, `jwt.interceptor.ts`, `permission.service.ts` |
| Điểm mạnh cần nhấn mạnh | JWT rotation, 2-layer permission check, Socket.IO realtime, AI với fallback |
| Điểm yếu cần chuẩn bị trả lời | Unit test, rate limiting, task move realtime, production deploy |

> **Chúc bảo vệ thành công! 🎓**
