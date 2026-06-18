# PROJECT REVIEW - ĐỒ ÁN TỐT NGHIỆP

> **Hệ thống quản lý dự án tích hợp AI** (Project Management System with AI)
> Backend: Node.js/Express + MongoDB | Frontend: Angular 20
> Được viết dựa hoàn toàn trên source code thực tế đọc ngày 18/06/2026.

---

## MỤC LỤC

1. [DANH SÁCH CHỨC NĂNG](#phần-1-danh-sách-chức-năng)
   - 1.1 Xác thực & Quản lý tài khoản
   - 1.2 Quản lý tổ chức (Organization)
   - 1.3 Quản lý phòng ban (Department)
   - 1.4 Quản lý dự án (Project)
   - 1.5 Quản lý bảng Kanban (Board & Column)
   - 1.6 Quản lý task (Issue)
   - 1.7 Quản lý thành viên dự án
   - 1.8 Hệ thống mời thành viên qua email
   - 1.9 Bình luận (Comment)
   - 1.10 Nhật ký hoạt động (Activity Log)
   - 1.11 Thông báo realtime (Notification)
   - 1.12 Workflow tùy chỉnh (Custom Workflow / State Machine)
   - 1.13 Gantt chart / Timeline
   - 1.14 Quản lý phát hành (Releases)
   - 1.15 Portfolio & Program Management
   - 1.16 Quản lý rủi ro (Risk Management)
   - 1.17 Phụ thuộc dự án (Project Dependencies)
   - 1.18 Quản lý kỹ năng (Skills Matrix)
   - 1.19 Quản lý năng lực & khối lượng công việc (Capacity & Workload)
   - 1.20 Nghỉ phép (Time Off)
   - 1.21 Phân công task thông minh (Task Assignment)
   - 1.22 AI - Phân tích dự án (Project AI)
   - 1.23 AI - Gợi ý deadline
   - 1.24 AI - Workflow Analysis
   - 1.25 AI - Gợi ý người thực hiện (Smart Assignee)
   - 1.26 AI - Tái cân bằng khối lượng (Workload Rebalance)
   - 1.27 AI - Dự báo burnout
   - 1.28 AI - Portfolio Health Check
   - 1.29 AI - Portfolio Risk Prediction
   - 1.30 AI - Giải quyết xung đột timeline
2. [DATABASE - MONGODB COLLECTIONS](#phần-2-database---mongodb-collections)
3. [KIẾN TRÚC VÀ CÔNG NGHỆ](#phần-3-kiến-trúc-và-công-nghệ)
4. [REALTIME VÀ TÍCH HỢP BÊN THỨ BA](#phần-4-realtime-và-tích-hợp-bên-thứ-ba)
5. [BẢNG API ENDPOINTS](#phần-5-bảng-api-endpoints)
6. [TỔNG KẾT](#tổng-kết)

---

## PHẦN 1: DANH SÁCH CHỨC NĂNG

---

### 1.1 Xác thực & Quản lý tài khoản

**Mục đích:** Cho phép người dùng đăng ký, đăng nhập, quản lý phiên làm việc bằng JWT (access token + refresh token), và cập nhật thông tin cá nhân.

**Công nghệ sử dụng:**
- Frontend: `LoginComponent`, `RegisterComponent`, `AuthService` (`auth.service.ts`), `TokenService` (`token.service.ts`), Akita store (`AuthStore`), `AuthGuard`
- Backend: `routes/auth.js`, `controllers/authController.js`, middleware `authMiddleware.js`, thư viện `bcryptjs`, `jsonwebtoken`
- Database: Collections `users`, `refreshtokens`

**Luồng đi chi tiết:**

*Đăng ký:*
1. User điền form (name, email, password, confirmPassword) tại `/register`
2. `AuthService.register()` gọi `POST /api/auth/register` với body `{name, email, password, confirmPassword}`
3. Middleware `express-validator` kiểm tra: name >= 2 ký tự, email hợp lệ, password >= 6 ký tự, confirmPassword trùng khớp
4. `authController.register()`: kiểm tra email trùng lặp trong DB, hash password bằng bcrypt (10 rounds), tạo User mới
5. Tạo accessToken (JWT, hết hạn 15 phút), tạo refreshToken (JWT, hết hạn 7 ngày) lưu vào DB
6. Response: `{message, user (không có password), accessToken, refreshToken}`
7. Frontend lưu cả 2 token vào `localStorage`, cập nhật `AuthStore`, điều hướng về `/project/board`

*Đăng nhập:*
1. User điền form tại `/login`
2. `POST /api/auth/login` → tìm user theo email (lowercase), so sánh password với bcrypt.compare
3. Tạo cặp token mới, trả về response tương tự đăng ký
4. Frontend: `TokenService.setTokens()`, cập nhật store, điều hướng

*Refresh token:*
1. Khi accessToken hết hạn, interceptor HTTP gọi `POST /api/auth/refresh-token` với refreshToken
2. Server verify refreshToken JWT, tìm trong DB, xóa token cũ, tạo cặp mới (rotation)
3. Frontend nhận token mới, retry request gốc

*Đăng xuất:*
1. `POST /api/auth/logout` với refreshToken → xóa refreshToken khỏi DB
2. Server còn disconnect tất cả socket của user qua `ioInstance.getIO().in('user_${userId}').fetchSockets()`
3. Frontend: `TokenService.clearTokens()`, xóa `selectedProjectId`, reset store, điều hướng `/login`

*Đổi mật khẩu:*
1. `PUT /api/auth/change-password` (yêu cầu JWT) với `{oldPassword, newPassword}`
2. Verify mật khẩu cũ, hash mật khẩu mới, xóa TẤT CẢ refreshToken của user (đăng xuất mọi thiết bị)

**File liên quan:**
- `D:\đatn\backend\src\routes\auth.js`
- `D:\đatn\backend\src\controllers\authController.js`
- `D:\đatn\backend\src\middleware\authMiddleware.js`
- `D:\đatn\backend\src\models\User.js`
- `D:\đatn\backend\src\models\RefreshToken.js`
- `D:\đatn\frontend\src\app\auth\login\login.component.ts`
- `D:\đatn\frontend\src\app\auth\register\register.component.ts`
- `D:\đatn\frontend\src\app\project\auth\auth.service.ts`
- `D:\đatn\frontend\src\app\core\services\token.service.ts`

---

### 1.2 Quản lý tổ chức (Organization)

**Mục đích:** Cho phép tạo và quản lý tổ chức (công ty, nhóm) với đa cấp thành viên, hỗ trợ multi-tenancy.

**Công nghệ sử dụng:**
- Frontend: `OrganizationService`, `OrganizationNewComponent`, `OrganizationSettingsComponent`, `OrgSwitcherComponent`, `OrgLayoutComponent`
- Backend: `routes/organizations.js`, `controllers/organizationController.js`, `controllers/orgMemberController.js`, middleware `orgContext.js`, `checkOrgRole.js`
- Database: Collections `organizations`, `organizationmembers`

**Luồng đi chi tiết:**
1. User tạo organization mới tại `/organizations/new` → `POST /api/organizations`
2. `orgContext.js` middleware đọc header `X-Org-Id` và xác nhận user là thành viên của org đó
3. `checkOrgRole.js` kiểm tra role trong org: `owner > admin > department_head > team_lead > member > guest`
4. Controller tạo org với các thông tin: name, slug (tự động từ name), logo, industry, size, plan, settings
5. Tự động tạo `OrganizationMember` với role `owner` cho người tạo
6. Switch org: `POST /api/organizations/:id/switch` → lưu `currentOrgId` vào localStorage, trả về orgRole
7. Frontend gửi header `X-Org-Id` cho mọi request liên quan đến org (portfolio, resource, capacity)

**File liên quan:**
- `D:\đatn\backend\src\routes\organizations.js`
- `D:\đatn\backend\src\controllers\organizationController.js`
- `D:\đatn\backend\src\controllers\orgMemberController.js`
- `D:\đatn\backend\src\middleware\orgContext.js`
- `D:\đatn\backend\src\middleware\checkOrgRole.js`
- `D:\đatn\backend\src\models\Organization.js`
- `D:\đatn\backend\src\models\OrganizationMember.js`
- `D:\đatn\frontend\src\app\organization\organization.service.ts`

---

### 1.3 Quản lý phòng ban (Department)

**Mục đích:** Tổ chức thành viên của tổ chức thành các phòng ban, hỗ trợ cấu trúc cây (department cha/con).

**Công nghệ sử dụng:**
- Frontend: `OrgDepartmentsComponent`, `OrganizationService.getDepartments/createDepartment/updateDepartment`
- Backend: `routes/departments.js`, `controllers/departmentController.js`
- Database: Collection `departments`

**Luồng đi chi tiết:**
1. Admin/Owner tạo phòng ban: `POST /api/organizations/:orgId/departments` (yêu cầu `X-Org-Id` header)
2. Department có thể có `parentDepartmentId` để tạo cấu trúc phân cấp
3. `headId` trỏ đến User được chỉ định là trưởng phòng
4. API trả về cả danh sách phẳng và cấu trúc cây `departments + tree`

**File liên quan:**
- `D:\đatn\backend\src\routes\departments.js`
- `D:\đatn\backend\src\controllers\departmentController.js`
- `D:\đatn\backend\src\models\Department.js`

---

### 1.4 Quản lý dự án (Project)

**Mục đích:** CRUD dự án với thông tin đầy đủ (tên, mô tả, ngày bắt đầu/kết thúc, status lifecycle, tech stack, URL repository/demo), tự động gán người tạo làm owner.

**Công nghệ sử dụng:**
- Frontend: `ProjectService`, `SettingsComponent`, `ProjectSwitcherComponent`
- Backend: `routes/projects.js`, `controllers/projectController.js`, middleware `checkProjectMember.js`, `checkRole.js`
- Database: Collections `projects`, `projectmembers`

**Luồng đi chi tiết:**
1. User tạo project: `POST /api/projects` → tự động tạo `ProjectMember` với role `owner`
2. Khi vào app, `ProjectService.getProject()` gọi `GET /api/projects` → lấy danh sách project user là thành viên
3. Load project đầu tiên (hoặc theo `selectedProjectId` trong localStorage)
4. Gọi song song: boards, members, my-permissions → cập nhật Akita store
5. Switch project: `PUT /api/projects/:id/last-accessed` cập nhật timestamp, reload data
6. Project lifecycle: `status` enum = `planning | in_development | testing | released | maintenance | paused | cancelled`
7. Soft delete: `deletedAt` field, query tự động lọc `deletedAt: null`

**File liên quan:**
- `D:\đatn\backend\src\routes\projects.js`
- `D:\đatn\backend\src\controllers\projectController.js`
- `D:\đatn\backend\src\middleware\checkProjectMember.js`
- `D:\đatn\backend\src\middleware\checkRole.js`
- `D:\đatn\backend\src\models\Project.js`
- `D:\đatn\frontend\src\app\project\state\project\project.service.ts`

---

### 1.5 Quản lý bảng Kanban (Board & Column)

**Mục đích:** Mỗi project có nhiều board, mỗi board có nhiều column (status) sắp xếp theo position. Column đại diện cho trạng thái của task (Backlog, In Progress, Done...).

**Công nghệ sử dụng:**
- Frontend: `BoardComponent`, `BoardDndComponent`, `BoardDndListComponent`, `ProjectService.addColumn/moveColumn/deleteColumn`
- Backend: `routes/boards.js`, `routes/columns.js`, `controllers/boardController.js`, `controllers/columnController.js`, middleware `projectAccess.js`
- Database: Collections `boards`, `columns`

**Luồng đi chi tiết:**
1. Tạo project mới: `ProjectService.setupNewProject()` tự động tạo board "Kanban Board" và 4 column mặc định: Backlog, Selected for Development, In Progress, Done
2. `GET /api/projects/:projectId/boards/:boardId` trả về board + tất cả columns + tasks
3. Move column: `PUT .../columns/:columnId/move` với `{newPosition}` → reorder tất cả column trong board
4. Drag-and-drop task giữa columns được handle bởi `BoardDndComponent` (Angular CDK)

**File liên quan:**
- `D:\đatn\backend\src\routes\boards.js`
- `D:\đatn\backend\src\routes\columns.js`
- `D:\đatn\backend\src\controllers\boardController.js`
- `D:\đatn\backend\src\controllers\columnController.js`
- `D:\đatn\backend\src\models\Board.js`
- `D:\đatn\backend\src\models\Column.js`

---

### 1.6 Quản lý task (Issue)

**Mục đích:** CRUD task với đầy đủ thông tin: tiêu đề, mô tả (rich text), người thực hiện, độ ưu tiên (low/medium/high/critical), ngày đến hạn, vị trí trong column, workflow state, SLA. Hỗ trợ drag-and-drop giữa columns và trong column.

**Công nghệ sử dụng:**
- Frontend: `IssueDetailComponent`, `IssueModalComponent`, `AddIssueModalComponent`, `ProjectService.updateIssue/deleteIssue`, `BoardDndComponent`
- Backend: `routes/tasks.js`, `routes/boardTasks.js`, `routes/columnTasks.js`, `controllers/taskController.js`, middleware `checkTask.js`, `checkTaskAccess.js`, `checkPermission.js`
- Database: Collections `tasks`, `activitylogs`

**Luồng đi chi tiết:**
1. Tạo task: User click "Add Issue" → `AddIssueModalComponent` mở → điền form → `POST /api/columns/:columnId/tasks`
2. Backend tính `position` = max(position) + 1 trong column
3. Tạo task, log activity 'created', gửi notification cho assignee (nếu khác người tạo)
4. Cập nhật task: `PUT /api/tasks/:id` với các field thay đổi → so sánh snapshot trước/sau để log activity
5. Di chuyển task: khi drag-drop → `PUT /api/tasks/:id/move` với `{targetColumnId, newPosition}`
   - Cùng column: reorder bằng `$inc: {position: 1/-1}` cho các task bị dịch chuyển
   - Khác column: xóa gap ở column cũ, mở chỗ ở column mới, cập nhật columnId
6. Xóa task: soft delete (task + tất cả comments), reorder column, emit socket event `task_deleted`, gửi notification cho assignee
7. Permission: owner/admin có thể xóa mọi task; member chỉ xóa task do mình tạo (check `createdBy`)
8. `checkPermission` middleware kiểm tra `canEditTask`, `canDragTask` per-member permissions

**File liên quan:**
- `D:\đatn\backend\src\routes\tasks.js`
- `D:\đatn\backend\src\routes\boardTasks.js`
- `D:\đatn\backend\src\routes\columnTasks.js`
- `D:\đatn\backend\src\controllers\taskController.js`
- `D:\đatn\backend\src\models\Task.js`
- `D:\đatn\frontend\src\app\project\components\issues\issue-detail\issue-detail.component.ts`

---

### 1.7 Quản lý thành viên dự án

**Mục đích:** Quản lý danh sách thành viên trong project với roles (owner/admin/member) và custom permissions (canEditTask, canDragTask, canAssignSelf, canAssignOthers).

**Công nghệ sử dụng:**
- Frontend: `MembersComponent`
- Backend: `routes/projects.js` (member routes), `controllers/memberController.js`
- Database: Collection `projectmembers`

**Luồng đi chi tiết:**
1. `GET /api/projects/:id/members` → danh sách members kèm thông tin user
2. Thêm member: `POST /api/projects/:id/members` (yêu cầu owner/admin) với `{userId, role}`
3. Cập nhật role: `PUT /api/projects/:id/members/:userId` (chỉ owner)
4. Cập nhật permissions: `PUT /api/projects/:id/members/:userId/permissions` (chỉ owner)
5. `GET /api/projects/:id/my-permissions` → lấy permissions của user hiện tại
6. Xóa thành viên: `DELETE /api/projects/:id/members/:userId` (owner/admin)

**File liên quan:**
- `D:\đatn\backend\src\controllers\memberController.js`
- `D:\đatn\backend\src\models\ProjectMember.js`
- `D:\đatn\frontend\src\app\project\pages\members\members.component.ts`

---

### 1.8 Hệ thống mời thành viên qua email

**Mục đích:** Mời người dùng (kể cả chưa đăng ký) tham gia project qua email với token có thời hạn 48 giờ.

**Công nghệ sử dụng:**
- Frontend: `InviteAcceptComponent`, `InviteRejectComponent`
- Backend: `routes/invite.js`, `routes/projects.js` (invitation sub-routes), `controllers/invitationController.js`, `utils/emailService.js` (Nodemailer)
- Database: Collection `projectinvitations`

**Luồng đi chi tiết:**
1. Owner/Admin tạo invitation: `POST /api/projects/:id/invitations` với `{email, role}`
2. Backend kiểm tra: email đã là thành viên chưa, đã có invitation pending chưa
3. Tạo `ProjectInvitation` với UUID token, `expiredAt = now + 48h`
4. Gọi `emailService.sendInvitationEmail()` → Nodemailer gửi HTML email có nút "Chấp nhận" và "Từ chối"
   - URL Accept: `${CLIENT_URL}/invite/accept/${token}`
   - URL Reject: `${CLIENT_URL}/invite/reject/${token}`
5. Người nhận click Accept → frontend tại `/invite/accept/:token` → kiểm tra đăng nhập → `POST /api/invite/:token/accept`
6. Server verify token, email phải khớp user đang đăng nhập, tạo `ProjectMember`, notify người mời
7. Cron job chạy mỗi giờ: `updateMany({status: 'pending', expiredAt: {$lt: now}}, {status: 'expired'})`
8. Dev mode (SMTP chưa cấu hình): log link vào console thay vì gửi email thật

**File liên quan:**
- `D:\đatn\backend\src\routes\invite.js`
- `D:\đatn\backend\src\controllers\invitationController.js`
- `D:\đatn\backend\src\utils\emailService.js`
- `D:\đatn\backend\src\models\ProjectInvitation.js`
- `D:\đatn\frontend\src\app\invite\invite-accept.component.ts`

---

### 1.9 Bình luận (Comment)

**Mục đích:** Người dùng có thể bình luận trên từng task, chỉ tác giả mới có thể sửa/xóa.

**Công nghệ sử dụng:**
- Frontend: `IssueCommentComponent`, `IssueCommentsComponent`, `ProjectService.updateIssueComment/editComment/deleteComment`
- Backend: `routes/tasks.js` (GET/POST nested), `routes/comments.js` (PUT/DELETE), `controllers/commentController.js`, middleware `checkCommentOwner.js`
- Database: Collection `comments`

**Luồng đi chi tiết:**
1. Load comments: `GET /api/tasks/:taskId/comments`
2. Tạo comment: `POST /api/tasks/:taskId/comments` với `{content}` → tạo Comment, log activity 'commented', notify assignee
3. Sửa comment: `PUT /api/comments/:id` (chỉ author) → middleware `checkCommentOwner` verify
4. Xóa comment: `DELETE /api/comments/:id` (chỉ author) → soft delete

**File liên quan:**
- `D:\đatn\backend\src\routes\comments.js`
- `D:\đatn\backend\src\controllers\commentController.js`
- `D:\đatn\backend\src\middleware\checkCommentOwner.js`
- `D:\đatn\backend\src\models\Comment.js`

---

### 1.10 Nhật ký hoạt động (Activity Log)

**Mục đích:** Ghi lại tất cả thay đổi của task (tạo, cập nhật, di chuyển, gán người, bình luận, xóa, đổi trạng thái workflow) để theo dõi lịch sử.

**Công nghệ sử dụng:**
- Frontend: `IssueFeedComponent`
- Backend: `controllers/activityController.js`, `utils/activityLogger.js`
- Database: Collection `activitylogs`

**Luồng đi chi tiết:**
1. Mọi action trên task đều gọi `activityLogger.log(taskId, userId, action, oldValue, newValue)` - fire-and-forget (không throw exception)
2. `action` types: `created | updated | moved | assigned | commented | deleted`
3. `GET /api/tasks/:taskId/activities` → danh sách ActivityLog theo taskId
4. `GET /api/tasks/:taskId/feed` → kết hợp activities và comments, sắp xếp theo thời gian

**File liên quan:**
- `D:\đatn\backend\src\controllers\activityController.js`
- `D:\đatn\backend\src\utils\activityLogger.js`
- `D:\đatn\backend\src\models\ActivityLog.js`

---

### 1.11 Thông báo realtime (Notification)

**Mục đích:** Gửi thông báo real-time cho người dùng khi có sự kiện liên quan (task được giao, sắp đến hạn, quá hạn, comment mới, thành viên mới, vi phạm SLA...).

**Công nghệ sử dụng:**
- Frontend: `NotificationService`, `NotificationBellComponent`, `NotificationsComponent`, `NotificationToastComponent`, Socket.IO client
- Backend: `routes/notifications.js`, `controllers/notificationController.js`, `services/notificationService.js`, Socket.IO server
- Database: Collection `notifications`

**Luồng đi chi tiết:**
1. Khi user đăng nhập, `NotificationService.connect()` kết nối Socket.IO với JWT trong `auth.token`
2. Server `io.use()` middleware verify JWT, tìm user, attach `socket.userId`
3. Socket tự động join room `user_${userId}` để nhận thông báo cá nhân
4. Khi có event (task assigned, deleted...): `notifService.create()` → tạo Notification trong DB → emit `notification` event qua socket đến `user_${recipient}`
5. Frontend `socket.on('notification', ...)` → tăng unread count, hiển thị toast
6. `socket.on('task_deleted', ...)` → frontend tự động remove task khỏi board
7. API quản lý notification: GET list (phân trang), GET unread count, PUT mark read, PUT mark all read, DELETE

**Notification types:** `task_assigned | task_due_soon | task_overdue | comment_added | member_invited | member_joined | task_moved | task_updated`

**Cron jobs sinh notification tự động:**
- Mỗi giờ: task sắp đến hạn trong 24h → `task_due_soon`
- Mỗi giờ: task quá hạn trong 1h vừa qua → `task_overdue`
- Mỗi giờ: kiểm tra SLA breach → `task_updated` (vi phạm SLA)
- Mỗi giờ (8AM): kiểm tra task đến hạn ngày mai của người đang nghỉ phép

**File liên quan:**
- `D:\đatn\backend\src\routes\notifications.js`
- `D:\đatn\backend\src\controllers\notificationController.js`
- `D:\đatn\backend\src\services\notificationService.js`
- `D:\đatn\backend\src\models\Notification.js`
- `D:\đatn\frontend\src\app\core\services\notification.service.ts`

---

### 1.12 Workflow tùy chỉnh (Custom Workflow / State Machine)

**Mục đích:** Cho phép project owner thiết kế quy trình làm việc tùy chỉnh với các trạng thái (states) và chuyển đổi (transitions) có kiểm soát quyền, yêu cầu phê duyệt, SLA và tự động hóa.

**Công nghệ sử dụng:**
- Frontend: `WorkflowListComponent`, `WorkflowDesignerComponent`, `WorkflowAiInsightsComponent`, `WorkflowService`
- Backend: `routes/workflows.js`, `controllers/workflowController.js`, `services/workflowEngine.js`
- Database: Collection `workflows`; Task có thêm fields: `workflowId`, `currentStateId`, `stateHistory`, `pendingApprovals`, `slaBreached`

**Luồng đi chi tiết:**

*Tạo/thiết kế workflow:*
1. Owner tạo workflow: `POST /api/projects/:projectId/workflows` với `{name, states[], transitions[], isDefault}`
2. `workflowEngine.validateWorkflow()` kiểm tra: ít nhất 1 trạng thái, có isInitial, có isFinal, mọi transition trỏ đến state hợp lệ
3. Auto-assign UUID cho state/transition nếu chưa có

*Gán workflow cho task:*
1. `POST /api/tasks/:id/assign-workflow` với `{workflowId}`
2. Tìm `initialState` (isInitial=true), gán `task.currentStateId`, khởi tạo `stateHistory`

*Thực hiện transition:*
1. `GET /api/tasks/:id/available-transitions` → lọc transition từ currentStateId, kiểm tra role/permission
2. User click transition → `POST /api/tasks/:id/transitions` với `{transitionId, comment}`
3. `workflowEngine.executeTransition()`:
   - Kiểm tra transition hợp lệ, user có quyền (allowedRoles/allowedUsers)
   - Kiểm tra requiredFields (task phải có assignee, dueDate... tùy config)
   - Nếu `requireApproval=true`: thêm vào `pendingApprovals`, notify approvers, trả về `status: 'pending_approval'`
   - Nếu không: apply transition ngay, đóng entry stateHistory cũ (tính durationHours), mở entry mới
4. Sau transition: emit socket `task_state_changed` cho tất cả project members, chạy auto actions (send_notification, assign_user)

*Phê duyệt:*
1. Approver duyệt/từ chối: `POST /api/tasks/:id/approve` với `{transitionId, decision: 'approve'|'reject', comment}`
2. Nếu đủ số phê duyệt (`approvalCount`) → apply transition
3. Nếu từ chối → xóa pending, notify requester

*SLA check (Cron mỗi giờ):*
1. Tìm tất cả task có workflowId, chưa breached SLA
2. `workflowEngine.isSlaBreach()`: tính giờ ở trạng thái hiện tại, so với `state.slaHours`
3. Nếu vi phạm: set `slaBreached=true`, log activity, notify owner và assignee

*AI Analyze Workflow:*
1. `POST /api/workflows/:id/ai/analyze` → tính thống kê avgHoursByState
2. Gửi prompt đến Gemini 1.5 Flash → JSON với bottleneck, avgCompletionDays, recommendations, suggestedSLA

**File liên quan:**
- `D:\đatn\backend\src\routes\workflows.js`
- `D:\đatn\backend\src\controllers\workflowController.js`
- `D:\đatn\backend\src\services\workflowEngine.js`
- `D:\đatn\backend\src\models\Workflow.js`
- `D:\đatn\frontend\src\app\project\pages\workflow\workflow-designer\workflow-designer.component.ts`

---

### 1.13 Gantt chart / Timeline

**Mục đích:** Hiển thị Gantt chart đa dự án với frappe-gantt, hỗ trợ kéo-thả reschedule, phát hiện xung đột (trùng lịch, quá hạn, blocked), tính critical path.

**Công nghệ sử dụng:**
- Frontend: `TimelineComponent`, `GanttChartComponent`, `TimelineService`, thư viện `frappe-gantt v1.2.2`
- Backend: `routes/timeline.js`, `controllers/timelineController.js`
- Database: Collections `tasks`, `boards`, `columns`, `projectmembers`

**Luồng đi chi tiết:**
1. `GET /api/timeline/projects` → chỉ lấy projects mà user là owner/admin, kèm task stats (count, minDate, maxDate)
2. `GET /api/timeline/tasks?projectIds[]=...` → kiểm tra quyền admin/owner với tất cả project trong list
3. Map task thành Gantt item: `{id, title, startDate, dueDate, assignee, progress, dependencies, isDone}`
4. Reschedule: kéo task trên Gantt → `PUT /api/timeline/tasks/:id/reschedule` với `{startDate, dueDate}` → log activity, notify assignee, emit socket `task_rescheduled`
5. `GET /api/timeline/conflicts?projectIds[]=...` → phát hiện 3 loại xung đột:
   - **Overdue**: task có dueDate < now và chưa done (isDone = task ở column cuối)
   - **Overlaps**: cùng assignee, date range chồng nhau
   - **Blocked**: task đã đến startDate nhưng dependency chưa done
6. `GET /api/timeline/critical-path/:projectId` → thuật toán CPM (Critical Path Method):
   - Topological sort bằng Kahn's algorithm
   - Forward pass: tính ES (Earliest Start), EF (Earliest Finish)
   - Backward pass: tính LS, LF, slack
   - Critical path = các node có slack = 0

**File liên quan:**
- `D:\đatn\backend\src\routes\timeline.js`
- `D:\đatn\backend\src\controllers\timelineController.js`
- `D:\đatn\frontend\src\app\project\pages\timeline\timeline.component.ts`
- `D:\đatn\frontend\src\app\project\pages\timeline\gantt-chart\gantt-chart.component.ts`
- `D:\đatn\frontend\src\app\project\pages\timeline\timeline.service.ts`

---

### 1.14 Quản lý phát hành (Releases)

**Mục đích:** Quản lý vòng đời phát hành phần mềm: tạo release với version (semantic), gắn task đã hoàn thành vào release, thay đổi trạng thái dự án, xem thống kê/timeline.

**Công nghệ sử dụng:**
- Frontend: `ProjectReleasesComponent`, `ReleasesOverviewComponent`, `CreateReleaseDialogComponent`, `ChangeStatusDialogComponent`, `ReleasesService`
- Backend: `routes/releases.js`, `controllers/releasesController.js`
- Database: Collections `releases`, `projects`, `tasks`

**Luồng đi chi tiết:**
1. **Overview** (`GET /api/releases/overview`): tổng hợp tất cả project của user với task stats, latest release, last activity
2. **Tạo release**: `POST /api/projects/:id/releases` (owner/admin) với `{version, releaseDate, releaseNotes, type, tasks[]}`
   - Cập nhật `project.version` = version mới
   - Notify tất cả project members
3. **Suggest version**: `GET /api/projects/:id/suggest-version?type=minor` → gợi ý phiên bản kế tiếp (semantic versioning: major/minor/patch/hotfix)
4. **Done tasks**: `GET /api/projects/:id/done-tasks` → tasks ở column cuối chưa thuộc release nào
5. **Change project status**: `POST /api/projects/:id/status` (chỉ owner) → đổi `planning|in_development|testing|released|maintenance|paused|cancelled`
6. **Statistics**: aggregate theo tháng, đếm tổng release, top project có nhiều release nhất
7. **Timeline**: danh sách release có phân trang, sorted by releaseDate desc

**File liên quan:**
- `D:\đatn\backend\src\routes\releases.js`
- `D:\đatn\backend\src\controllers\releasesController.js`
- `D:\đatn\backend\src\models\Release.js`
- `D:\đatn\frontend\src\app\project\state\releases\releases.service.ts`

---

### 1.15 Portfolio & Program Management

**Mục đích:** Quản lý danh mục dự án (Portfolio) và chương trình (Program) ở cấp tổ chức, xem dashboard tổng hợp, roadmap, phụ thuộc giữa dự án.

**Công nghệ sử dụng:**
- Frontend: `PortfolioListComponent`, `PortfolioDetailComponent`, `ProgramDetailComponent`, `PortfolioService`
- Backend: `routes/portfolios.js`, `routes/programs.js`, `controllers/portfolioController.js`, `controllers/programController.js`, `controllers/portfolioAiController.js`
- Database: Collections `portfolios`, `programs`

**Luồng đi chi tiết:**
1. Yêu cầu `X-Org-Id` header và `orgContext` middleware
2. `GET /api/portfolios` → tất cả portfolio của org
3. `GET /api/portfolios/:id/dashboard` → portfolio + programs + projects + risks, tính avgProgress, budgetUsage, riskCounts
4. `GET /api/portfolios/:id/roadmap` → programs + projects với dates để vẽ roadmap
5. `GET /api/portfolios/:id/dependencies` → ProjectDependency giữa các project trong portfolio
6. `GET /api/portfolios/:id/risk-matrix` → 5x5 matrix (probability vs impact)

**File liên quan:**
- `D:\đatn\backend\src\routes\portfolios.js`
- `D:\đatn\backend\src\controllers\portfolioController.js`
- `D:\đatn\backend\src\models\Portfolio.js`
- `D:\đatn\backend\src\models\Program.js`
- `D:\đatn\frontend\src\app\portfolio\portfolio.service.ts`

---

### 1.16 Quản lý rủi ro (Risk Management)

**Mục đích:** Tạo và theo dõi rủi ro ở cấp portfolio/program/project, tính risk score = probability * impact (1-5 x 1-5 = 1-25).

**Công nghệ sử dụng:**
- Frontend: `RiskMatrixComponent`
- Backend: `routes/risks.js`, `controllers/riskController.js`
- Database: Collection `risks`

**Luồng đi chi tiết:**
1. `POST /api/risks` với `{scopeType: 'portfolio'|'program'|'project', scopeId, title, category, probability, impact, mitigationPlan}`
2. Pre-save hook: `riskScore = probability * impact`
3. Categories: `technical | resource | financial | schedule | scope | external`
4. Statuses: `identified | mitigated | occurred | closed`
5. Risk matrix: 5x5 grid visualized on frontend

**File liên quan:**
- `D:\đatn\backend\src\routes\risks.js`
- `D:\đatn\backend\src\controllers\riskController.js`
- `D:\đatn\backend\src\models\Risk.js`

---

### 1.17 Phụ thuộc dự án (Project Dependencies)

**Mục đích:** Thiết lập quan hệ phụ thuộc giữa các project trong portfolio (Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish).

**Công nghệ sử dụng:**
- Backend: `routes/dependencies.js`, `controllers/dependencyController.js`
- Database: Collection `projectdependencies`

**Luồng đi chi tiết:**
1. `POST /api/dependencies` với `{fromProjectId, toProjectId, type, description, isBlocking}`
2. Unique index: `{fromProjectId, toProjectId}` (chỉ 1 quan hệ giữa 2 project)
3. `DELETE /api/dependencies/:id` xóa quan hệ

**File liên quan:**
- `D:\đatn\backend\src\models\ProjectDependency.js`

---

### 1.18 Quản lý kỹ năng (Skills Matrix)

**Mục đích:** Quản lý danh mục kỹ năng, gán kỹ năng cho user (tự đánh giá mức độ 1-5, số năm kinh nghiệm, chứng chỉ), endorse kỹ năng của nhau, xem ma trận kỹ năng toàn tổ chức.

**Công nghệ sử dụng:**
- Frontend: `SkillsMatrixComponent`, `ResourceService`
- Backend: `routes/skills.js`, `controllers/skillController.js`
- Database: Collections `skills`, `userskills`

**Luồng đi chi tiết:**
1. Seed dữ liệu kỹ năng tự động khi server khởi động (55+ kỹ năng: programming, framework, database, devops, design, soft_skill, language)
2. `GET /api/skills` → danh sách kỹ năng (filter theo category/search)
3. `GET /api/skills/users/:userId/skills` → kỹ năng của user kèm thông tin skill
4. `PUT /api/skills/users/:userId/skills` → cập nhật danh sách kỹ năng (upsert)
5. `POST /api/skills/users/:userId/skills/:skillId/endorse` → thêm userId vào `endorsedBy[]`
6. `GET /api/skills/organizations/:orgId/skills-matrix` → matrix: mỗi row là user, mỗi column là skill category

**File liên quan:**
- `D:\đatn\backend\src\routes\skills.js`
- `D:\đatn\backend\src\controllers\skillController.js`
- `D:\đatn\backend\src\models\Skill.js`
- `D:\đatn\backend\src\models\UserSkill.js`

---

### 1.19 Quản lý năng lực & khối lượng công việc (Capacity & Workload)

**Mục đích:** Theo dõi khối lượng công việc theo tuần của từng thành viên, tính utilization rate, phát hiện burnout risk, snapshot hàng tuần.

**Công nghệ sử dụng:**
- Frontend: `WorkloadDashboardComponent`, `ResourceService`
- Backend: `routes/capacity.js`, `controllers/capacityController.js`, `utils/workloadUtils.js`
- Database: Collections `users` (workCapacity field), `tasks`, `taskassignments`, `workloadsnapshots`

**Luồng đi chi tiết:**
1. `GET /api/users/:userId/capacity` → thông tin user + workCapacity (hoursPerWeek=40, workingDays, timezone, startTime, endTime)
2. `PUT /api/users/:userId/capacity` → cập nhật capacity settings
3. `GET /api/users/:userId/workload?weeks=8` → tính workload từng tuần:
   - Lấy TaskAssignments (phân bổ giờ theo tuần từ `weeklyAllocation` map)
   - Lấy direct tasks (có assignee nhưng không có TaskAssignment) → chia đều estimatedHours theo số tuần
   - Tính `utilization = allocatedHours / capacityHours * 100`
   - Tính `burnoutRisk` theo công thức: low/medium/high/critical
4. `GET /api/organizations/:orgId/capacity-overview` → tổng hợp toàn bộ member trong org tuần hiện tại
5. **Cron mỗi Chủ nhật 23:00**: `scheduleWeeklyWorkloadSnapshot()` → lưu snapshot, gửi cảnh báo burnout nếu risk high/critical

**File liên quan:**
- `D:\đatn\backend\src\routes\capacity.js`
- `D:\đatn\backend\src\controllers\capacityController.js`
- `D:\đatn\backend\src\models\WorkloadSnapshot.js`
- `D:\đatn\backend\src\utils\workloadUtils.js`

---

### 1.20 Nghỉ phép (Time Off)

**Mục đích:** Quản lý nghỉ phép của nhân viên (yêu cầu, phê duyệt/từ chối, xem lịch nghỉ toàn tổ chức), tích hợp vào tính toán capacity và AI gợi ý.

**Công nghệ sử dụng:**
- Frontend: `TimeoffCalendarComponent`, `ResourceService`
- Backend: `routes/timeoffs.js`, `controllers/timeOffController.js`
- Database: Collection `timeoffs`

**Luồng đi chi tiết:**
1. `POST /api/timeoffs` → tạo yêu cầu nghỉ phép, auto tính `totalHours = days * hoursPerDay`
2. `GET /api/timeoffs/my` → nghỉ phép của user hiện tại
3. `PUT /api/timeoffs/:id/approve` → admin/manager phê duyệt
4. `PUT /api/timeoffs/:id/reject` → từ chối
5. `PUT /api/timeoffs/:id/cancel` → user tự huỷ
6. `GET /api/timeoffs/organizations/:orgId/calendar?startDate&endDate` → lịch nghỉ toàn org trong khoảng thời gian
7. Cron 8AM hàng ngày: kiểm tra người nghỉ phép ngày mai có task đến hạn → gửi notification

**File liên quan:**
- `D:\đatn\backend\src\routes\timeoffs.js`
- `D:\đatn\backend\src\controllers\timeOffController.js`
- `D:\đatn\backend\src\models\TimeOff.js`

---

### 1.21 Phân công task thông minh (Task Assignment)

**Mục đích:** Gán task cho người thực hiện với tracked giờ ước tính/thực tế, phân bổ giờ theo tuần (`weeklyAllocation`), log thời gian làm việc.

**Công nghệ sử dụng:**
- Frontend: `ResourceService`
- Backend: `routes/assignments.js`, `controllers/assignmentController.js`
- Database: Collection `taskassignments`

**Luồng đi chi tiết:**
1. `POST /api/tasks/:taskId/assignments` → tạo assignment với `{userId, estimatedHours, startDate, dueDate, weeklyAllocation}`
2. `weeklyAllocation` là Map: `{"2026-W22": 8, "2026-W23": 8}` → số giờ phân bổ mỗi tuần
3. `POST /api/assignments/:id/log-time` → cộng actual hours
4. `GET /api/tasks/:taskId/assignments` → xem tất cả assignment của task

**File liên quan:**
- `D:\đatn\backend\src\controllers\assignmentController.js`
- `D:\đatn\backend\src\models\TaskAssignment.js`

---

### 1.22 AI - Phân tích dự án (Project AI)

**Mục đích:** Sử dụng LLM (Groq/llama-3.3-70b-versatile) để phân tích tiến độ dự án, dự đoán khả năng hoàn thành, tạo báo cáo Markdown.

**Công nghệ sử dụng:**
- Frontend: Component trong jira-control, gọi qua `project.service.ts`
- Backend: `routes/ai.js`, `controllers/aiController.js`, Groq SDK
- Database: Đọc: `boards`, `columns`, `tasks`

**Luồng đi chi tiết:**

*AI Summary (`GET /api/projects/:id/ai/summary`):*
1. Tổng hợp tất cả task của project (tên, status/column, priority, assignee, dueDate)
2. Tính statistics: total, byColumn, byPriority, byAssignee, overdue, completionRate
3. Build prompt → gửi đến Groq (model: llama-3.3-70b-versatile, max_tokens: 2048)
4. Prompt yêu cầu: Tóm tắt tiến độ, Điểm mạnh, Rủi ro, Đề xuất hành động
5. Response: `{summary: text, stats, model, generatedAt}`

*AI Predict (`POST /api/projects/:id/ai/predict`):*
1. Tương tự summary + deadline dự án từ body
2. Prompt yêu cầu: Kết quả dự đoán (đúng hạn/có nguy cơ/chắc chắn trễ), Mức tin cậy, Yếu tố quyết định, Hành động khẩn cấp

*AI Report (`POST /api/projects/:id/ai/report`):*
1. Build báo cáo chi tiết với bảng markdown (task theo cột, theo người phụ trách)
2. Prompt SYS_REPORTER yêu cầu 5 phần: Tổng quan, Tiến độ theo board/cột, Phân tích rủi ro, Thống kê, Đề xuất

**File liên quan:**
- `D:\đatn\backend\src\routes\ai.js`
- `D:\đatn\backend\src\controllers\aiController.js`

---

### 1.23 AI - Gợi ý deadline

**Mục đích:** Phân tích lịch sử task hoàn thành và workload hiện tại để gợi ý deadline hợp lý cho task mới, có rule-based fallback khi AI không khả dụng.

**Công nghệ sử dụng:**
- Backend: `controllers/aiController.js` (hàm `suggestDeadline`), Groq SDK
- Database: Đọc: `tasks`, `boards`, `columns`

**Luồng đi chi tiết:**
1. `POST /api/tasks/:id/suggest-deadline` (middleware `checkPermission('canEditTask')`)
2. Lấy task history: 15 task hoàn thành gần nhất trong project (columns có tên như done/completed/xong)
3. Tính workload assignee: đếm task đang mở, số task high/critical priority
4. Build prompt với ngày hôm nay, thông tin task, lịch sử, workload → gửi Groq (JSON mode)
5. Parse response: `{suggestedDeadline, estimatedDays, confidence, reasoning, warnings, alternatives}`
6. **Fallback** nếu AI lỗi: rule-based tính dựa trên priority (critical=2d, high=5d, medium=10d, low=14d) + workload adjustment

**File liên quan:**
- `D:\đatn\backend\src\controllers\aiController.js` (hàm `suggestDeadline`, `suggestDeadlineRuleBased`)

---

### 1.24 AI - Workflow Analysis

**Mục đích:** Phân tích hiệu suất workflow, phát hiện bottleneck, gợi ý cải thiện SLA bằng Google Gemini 1.5 Flash.

**Công nghệ sử dụng:**
- Backend: `controllers/workflowController.js` (hàm `aiAnalyzeWorkflow`), Google Generative AI SDK
- AI model: Gemini 1.5 Flash

**Luồng đi chi tiết:**
1. `POST /api/workflows/:id/ai/analyze`
2. Tính avgHoursByState từ stateHistory của tất cả task trong workflow
3. Build prompt với thống kê → gọi Gemini API
4. Response JSON: `{bottleneck: {stateName, reason}, avgCompletionDays, recommendations[], suggestedSLA[]}`

---

### 1.25 AI - Gợi ý người thực hiện (Smart Assignee)

**Mục đích:** Phân tích kỹ năng, workload, time-off của team members để gợi ý top 3 người phù hợp nhất cho task.

**Công nghệ sử dụng:**
- Frontend: `SmartAssignmentComponent`
- Backend: `controllers/resourceAiController.js` (hàm `recommendAssignee`), Groq SDK
- Database: Đọc: `projectmembers`, `userskills`, `skills`, `tasks`, `timeoffs`

**Luồng đi chi tiết:**
1. `POST /api/tasks/:taskId/ai/recommend-assignee`
2. Lấy tất cả project members kèm skills, tính workload tuần hiện tại, kiểm tra time-off
3. Build context: `{userId, name, skills[], workloadPercent, tasksCompleted, hoursOnLeave, availableHours}`
4. Gửi Groq prompt (JSON mode): top 3 candidates với `{matchScore, reasons[], concerns[], recommendation}`
5. Enrich response với user details thực tế

---

### 1.26 AI - Tái cân bằng khối lượng (Workload Rebalance)

**Mục đích:** Phân tích người overloaded (>100%) và underloaded (<70%), gợi ý chuyển task để cân bằng team.

**Công nghệ sử dụng:**
- Backend: `controllers/resourceAiController.js` (hàm `rebalanceWorkload`), Groq SDK

**Luồng đi chi tiết:**
1. `POST /api/projects/:projectId/ai/rebalance`
2. Tính utilization % cho từng member từ task đang còn active (dueDate >= now)
3. Nếu không có overloaded → trả về `{suggestions: [], message: 'No rebalancing needed'}`
4. Build prompt → Groq gợi ý tối đa 5 reassignment: `{taskTitle, fromUser, toUser, reason}`

---

### 1.27 AI - Dự báo burnout

**Mục đích:** Phân tích 4 tuần workload snapshot gần nhất, dự báo nguy cơ burnout từng thành viên trong org.

**Công nghệ sử dụng:**
- Frontend: `AiInsightsComponent`
- Backend: `controllers/resourceAiController.js` (hàm `burnoutPrediction`), Groq SDK
- Database: Đọc: `organizationmembers`, `workloadsnapshots`

**Luồng đi chi tiết:**
1. `GET /api/organizations/:orgId/ai/burnout-prediction`
2. Lấy 4 workload snapshots gần nhất của mỗi member
3. Tính avgUtilization, overloadedWeeks, burnoutRisk per user
4. Lọc user có medium/high/critical risk → gửi Groq
5. Response: `{atRisk[], aiAnalysis: {userAnalyses[], teamHealthSummary, organizationalRecommendations[]}}`

---

### 1.28 AI - Portfolio Health Check

**Mục đích:** Đánh giá "sức khỏe" portfolio dựa trên progress, budget, risks bằng Groq AI.

**Công nghệ sử dụng:**
- Backend: `controllers/portfolioAiController.js` (hàm `healthCheck`), Groq SDK

**Luồng đi chi tiết:**
1. `POST /api/portfolios/:id/ai/health-check`
2. Thu thập: portfolio info, programs, projects, risks; tính avgProgress, budgetPct, highRisks count
3. Groq response JSON: `{healthScore: 0-100, grade: A-F, strengths[], concerns[], recommendations[], predictedCompletion}`

---

### 1.29 AI - Portfolio Risk Prediction

**Mục đích:** Dự đoán các rủi ro tiềm ẩn mới có thể xuất hiện trong portfolio.

**Công nghệ sử dụng:**
- Backend: `controllers/portfolioAiController.js` (hàm `riskPrediction`), Groq SDK

**Luồng đi chi tiết:**
1. `POST /api/portfolios/:id/ai/risk-prediction`
2. Gửi context: portfolio status, risks hiện tại, distribution theo category, project statuses
3. Groq gợi ý 3-5 rủi ro mới: `{title, category, probability, impact, rationale, suggestedMitigation}`
4. Response: `{predictedRisks[], overallRiskTrend, summary}`

---

### 1.30 AI - Giải quyết xung đột timeline

**Mục đích:** Đề xuất 3 giải pháp cụ thể để giải quyết xung đột lịch (trùng lịch, quá hạn, bị block) bằng Google Gemini.

**Công nghệ sử dụng:**
- Backend: `controllers/timelineController.js` (hàm `aiResolveConflict`), Google Generative AI SDK
- AI model: Gemini 1.5 Flash

**Luồng đi chi tiết:**
1. `POST /api/timeline/ai/resolve-conflict` với `{conflictType: 'overlap'|'overdue'|'blocked', tasks[]}`
2. Build prompt bằng tiếng Việt → Gemini
3. Response JSON: `{suggestions: [{title, description, action}]}`

---

## PHẦN 2: DATABASE - MONGODB COLLECTIONS

### Danh sách 17 collection

---

#### 1. `users`
| Field | Type | Constraints |
|-------|------|-------------|
| name | String | required |
| email | String | required, unique, lowercase |
| password | String | required (bcrypt hash, không trả về API) |
| avatar | String | default: null |
| workCapacity.hoursPerWeek | Number | default: 40 |
| workCapacity.workingDays | [String] | default: ['mon','tue','wed','thu','fri'] |
| workCapacity.timezone | String | default: 'Asia/Ho_Chi_Minh' |
| workCapacity.startTime | String | default: '09:00' |
| workCapacity.endTime | String | default: '18:00' |
| deletedAt | Date | soft delete, default: null |
| createdAt, updatedAt | Date | auto |

**Pre-query hook:** Tự động filter `deletedAt: null`

---

#### 2. `refreshtokens`
| Field | Type | Constraints |
|-------|------|-------------|
| token | String | required, unique |
| userId | ObjectId | ref: User, required |
| expiresAt | Date | required |
| createdAt | Date | auto |

---

#### 3. `organizations`
| Field | Type | Constraints |
|-------|------|-------------|
| name | String | required, unique, trim |
| slug | String | unique, lowercase (auto-generated từ name) |
| logo | String | null |
| description | String | '' |
| industry | String | enum: banking/finance/technology/healthcare/education/other |
| size | String | enum: 1-10/11-50/51-200/201-500/500+ |
| country | String | 'Vietnam' |
| website | String | '' |
| plan | String | enum: free/starter/business/enterprise, default: free |
| maxMembers | Number | 10 |
| maxProjects | Number | 5 |
| settings.allowMemberInvite | Boolean | true |
| settings.requireApprovalForJoin | Boolean | false |
| settings.defaultProjectVisibility | String | 'private' |
| settings.ssoEnabled | Boolean | false |
| createdBy | ObjectId | ref: User |
| ownerId | ObjectId | ref: User |
| deletedAt | Date | soft delete |

---

#### 4. `organizationmembers`
| Field | Type | Constraints |
|-------|------|-------------|
| organizationId | ObjectId | ref: Organization, required |
| userId | ObjectId | ref: User, required |
| departmentId | ObjectId | ref: Department, null |
| orgRole | String | enum: owner/admin/department_head/team_lead/member/guest |
| jobTitle | String | '' |
| employeeId | String | '' |
| joinedAt | Date | Date.now |
| invitedBy | ObjectId | ref: User, null |
| status | String | enum: active/invited/suspended/deactivated |
| permissions | [String] | [] |

**Index:** `{organizationId, userId}` unique

---

#### 5. `departments`
| Field | Type | Constraints |
|-------|------|-------------|
| organizationId | ObjectId | ref: Organization, required, index |
| name | String | required, trim |
| description | String | '' |
| headId | ObjectId | ref: User, null |
| parentDepartmentId | ObjectId | ref: Department, null (cho cấu trúc cây) |
| color | String | '#1890ff' |
| icon | String | 'team' |
| deletedAt | Date | soft delete |

---

#### 6. `projects`
| Field | Type | Constraints |
|-------|------|-------------|
| name | String | required |
| description | String | '' |
| background | String | '' |
| owner | ObjectId | ref: User, required |
| startDate | Date | null |
| dueDate | Date | null |
| status | String | enum: planning/in_development/testing/released/maintenance/paused/cancelled |
| version | String | '1.0.0' |
| releaseDate | Date | null |
| endDate | Date | null |
| progress | Number | 0-100 |
| techStack | [String] | [] |
| repository | String | '' |
| demoUrl | String | '' |
| organizationId | ObjectId | ref: Organization, null, index |
| departmentId | ObjectId | ref: Department, null |
| portfolioId | ObjectId | ref: Portfolio, null, index |
| programId | ObjectId | ref: Program, null, index |
| visibility | String | enum: private/department/organization/public |
| deletedAt | Date | soft delete |

---

#### 7. `projectmembers`
| Field | Type | Constraints |
|-------|------|-------------|
| projectId | ObjectId | ref: Project, required |
| user | ObjectId | ref: User, required |
| role | String | enum: owner/admin/member |
| canEditTask | Boolean | false |
| canDragTask | Boolean | false |
| canAssignSelf | Boolean | false |
| canAssignOthers | Boolean | false |
| lastAccessedAt | Date | null |

**Index:** `{projectId, user}` unique

---

#### 8. `projectinvitations`
| Field | Type | Constraints |
|-------|------|-------------|
| projectId | ObjectId | ref: Project, required |
| email | String | required, lowercase, trim |
| invitedBy | ObjectId | ref: User, required |
| role | String | enum: admin/member |
| token | String | required, unique (UUID) |
| status | String | enum: pending/accepted/rejected/expired |
| expiredAt | Date | required (now + 48h) |

**Index:** `{projectId, email}`

---

#### 9. `boards`
| Field | Type | Constraints |
|-------|------|-------------|
| projectId | ObjectId | ref: Project, required |
| name | String | required |
| deletedAt | Date | soft delete |

---

#### 10. `columns`
| Field | Type | Constraints |
|-------|------|-------------|
| boardId | ObjectId | ref: Board, required |
| name | String | required |
| position | Number | required, default: 0 |
| deletedAt | Date | soft delete |

---

#### 11. `tasks`
| Field | Type | Constraints |
|-------|------|-------------|
| columnId | ObjectId | ref: Column, required |
| boardId | ObjectId | ref: Board, required |
| title | String | required |
| description | String | '' |
| assignee | ObjectId | ref: User, null |
| priority | String | enum: low/medium/high/critical |
| dueDate | Date | null |
| position | Number | required, default: 0 |
| createdBy | ObjectId | ref: User, null |
| startDate | Date | null |
| estimatedHours | Number | null |
| actualHours | Number | null |
| dependencies | [ObjectId] | ref: Task (task dependency) |
| progress | Number | 0-100 |
| workflowId | ObjectId | ref: Workflow, null |
| currentStateId | String | null (UUID của state) |
| slaBreached | Boolean | false |
| stateHistory | [{stateId, enteredAt, exitedAt, durationHours, userId}] | |
| pendingApprovals | [{transitionId, requesterId, requestedAt, comment, approvers[]}] | |
| deletedAt | Date | soft delete |

---

#### 12. `comments`
| Field | Type | Constraints |
|-------|------|-------------|
| taskId | ObjectId | ref: Task, required |
| user | ObjectId | ref: User, required |
| content | String | required |
| deletedAt | Date | soft delete |

---

#### 13. `activitylogs`
| Field | Type | Constraints |
|-------|------|-------------|
| taskId | ObjectId | ref: Task, required |
| user | ObjectId | ref: User, required |
| action | String | enum: created/updated/moved/assigned/commented/deleted |
| oldValue | Mixed | null |
| newValue | Mixed | null |
| createdAt | Date | auto |

---

#### 14. `notifications`
| Field | Type | Constraints |
|-------|------|-------------|
| recipient | ObjectId | ref: User, required, index |
| type | String | enum: task_assigned/task_due_soon/task_overdue/comment_added/member_invited/member_joined/task_moved/task_updated |
| title | String | required |
| body | String | '' |
| link | String | '' |
| isRead | Boolean | false, index |
| meta | Mixed | {} (taskId, projectId...) |
| createdAt | Date | auto |

**Index:** `{recipient, createdAt: -1}` (compound)

---

#### 15. `workflows`
| Field | Type | Constraints |
|-------|------|-------------|
| projectId | ObjectId | ref: Project, required, index |
| name | String | required |
| description | String | '' |
| isDefault | Boolean | false |
| states | [StateSchema] | [{id(UUID), name, color, position, isInitial, isFinal, slaHours}] |
| transitions | [TransitionSchema] | [{id(UUID), name, fromStateId, toStateId, allowedRoles[], allowedUsers[], requiredFields[], requireApproval, approvers[], approvalCount, autoActions[]}] |
| createdBy | ObjectId | ref: User |
| deletedAt | Date | soft delete |

---

#### 16. `releases`
| Field | Type | Constraints |
|-------|------|-------------|
| projectId | ObjectId | ref: Project, required, index |
| version | String | required |
| releaseDate | Date | required |
| releaseNotes | String | '' |
| type | String | enum: major/minor/patch/hotfix |
| status | String | enum: draft/released/rollback |
| createdBy | ObjectId | ref: User |
| tasks | [ObjectId] | ref: Task |
| deletedAt | Date | soft delete |

---

#### 17. `portfolios`
| Field | Type | Constraints |
|-------|------|-------------|
| organizationId | ObjectId | ref: Organization, required, index |
| name | String | required, trim |
| description | String | '' |
| strategicGoals | [String] | [] |
| status | String | enum: planning/active/on_hold/completed/cancelled |
| startDate, targetEndDate, actualEndDate | Date | null |
| budget.total, budget.spent | Number | 0 |
| budget.currency | String | 'VND' |
| ownerId | ObjectId | ref: User, required |
| stakeholders | [ObjectId] | ref: User |
| color | String | '#1890ff' |
| icon | String | 'folder' |
| createdBy | ObjectId | ref: User |
| deletedAt | Date | soft delete |

---

#### Các collection bổ sung (Resource Management):

| Collection | Mục đích chính |
|------------|----------------|
| `programs` | Program trong Portfolio (portfolioId, organizationId, name, status, budget, programManagerId) |
| `risks` | Risk management (scopeType, scopeId, probability, impact, riskScore=prob*impact, category, status) |
| `projectdependencies` | Quan hệ FS/SS/FF/SF giữa projects trong portfolio |
| `skills` | Danh mục kỹ năng (name, category, color, icon) |
| `userskills` | Kỹ năng của user (userId, skillId, level 1-5, yearsOfExperience, endorsedBy[], certificates[]) |
| `taskassignments` | Phân công chi tiết (taskId, userId, estimatedHours, weeklyAllocation Map) |
| `timeoffs` | Nghỉ phép (userId, type, startDate, endDate, totalHours auto-calc, status, approvedBy) |
| `workloadsnapshots` | Snapshot workload tuần (userId, weekStart, capacityHours, allocatedHours, utilization, burnoutRisk) |

---

### Sơ đồ ERD (ASCII)

```
Organization ──1:N──> OrganizationMember <──N:1── User
     │                                               │
     1:N                                            1:N
     ↓                                               ↓
Department ──1:N──> OrganizationMember        RefreshToken
     │
     1:N
     ↓
Project ──1:1──> Board ──1:N──> Column ──1:N──> Task ──1:N──> Comment
   │               │                               │              │
   1:N             │                               │              └── user
   │               └── projectId                  ├── assignee ──> User
ProjectMember ──> User                             ├── workflowId ──> Workflow
   │                                               ├── dependencies ──> [Task]
   ├── projectId                                   └── stateHistory[]
   └── user
   
Project ──1:N──> ProjectInvitation
Project ──1:N──> Release ──N:N──> [Task]
Project ──1:N──> Workflow (state machine)

Portfolio ──1:N──> Program ──1:N──> Project
Portfolio / Program / Project ──1:N──> Risk
Project ──N:N──> Project (via ProjectDependency)

User ──1:1──> WorkCapacity (embedded)
User ──1:N──> UserSkill ──N:1── Skill
User ──1:N──> TaskAssignment ──N:1── Task
User ──1:N──> TimeOff
User ──1:N──> WorkloadSnapshot (weekly)
User ──1:N──> Notification
User ──1:N──> ActivityLog (as performer)
Task ──1:N──> ActivityLog
```

---

## PHẦN 3: KIẾN TRÚC VÀ CÔNG NGHỆ

### 3.1 Dependencies

#### Backend (`package.json`)

| Package | Version | Mục đích trong dự án |
|---------|---------|----------------------|
| express | ^4.18.2 | Web framework chính |
| mongoose | ^8.23.1 | ODM cho MongoDB |
| jsonwebtoken | ^9.0.0 | Tạo và verify JWT (access + refresh token) |
| bcryptjs | ^2.4.3 | Hash password (10 salt rounds) |
| socket.io | ^4.8.3 | Real-time notifications, task events |
| nodemailer | ^8.0.7 | Gửi email mời thành viên |
| groq-sdk | ^1.2.0 | AI text generation (llama-3.3-70b) cho project AI, resource AI, portfolio AI |
| @google/generative-ai | ^0.24.1 | Gemini 1.5 Flash cho workflow analysis, timeline conflict resolution |
| @anthropic-ai/sdk | ^0.39.0 | Anthropic Claude SDK (có dependency nhưng không thấy sử dụng trực tiếp trong code đọc được) |
| express-validator | ^7.0.1 | Validation middleware (auth routes) |
| cors | ^2.8.5 | Cross-Origin Resource Sharing |
| dotenv | ^16.0.3 | Biến môi trường từ .env |
| swagger-ui-express | ^5.0.0 | Swagger UI tại /api/docs |
| nodemon | ^2.0.22 | Dev server auto-restart |

#### Frontend (`package.json`)

| Package | Version | Mục đích trong dự án |
|---------|---------|----------------------|
| @angular/core | ^20.3.18 | Framework chính (Angular 20) |
| @angular/router | ^20.3.18 | Lazy loading routes (loadComponent/loadChildren) |
| @angular/forms | ^20.3.18 | Reactive forms |
| @angular/cdk | ^20.2.14 | Drag-and-drop cho Kanban board |
| @datorama/akita | ^7.1.1 | State management (ProjectStore, AuthStore, FilterStore) |
| @datorama/akita-ng-entity-service | ^7.0.0 | Akita entity service |
| ng-zorro-antd | ^20.4.4 | UI component library (Ant Design) - Modal, Table, Form, Notification... |
| frappe-gantt | ^1.2.2 | Gantt chart component cho Timeline |
| ngx-quill | ^28.0.2 | Rich text editor cho task description |
| quill | ^2.0.3 | Quill editor core |
| socket.io-client | ^4.8.3 | Kết nối WebSocket với backend |
| @ngx-translate/core | ^17.0.0 | Đa ngôn ngữ (i18n) |
| @ngx-translate/http-loader | ^17.0.0 | Load file translation từ HTTP |
| rxjs | ^7.8.1 | Reactive programming (Observables, Subjects, operators) |
| date-fns | ^2.14.0 | Xử lý ngày tháng |
| @ctrl/tinycolor | ^4.2.0 | Xử lý màu sắc |
| @sentry/angular | ^9.30.0 | Error monitoring & performance |
| @ngneat/until-destroy | ^8.0.3 | Tự động unsubscribe Observable |
| @ngneat/content-loader | ^7.0.0 | Skeleton loading placeholder |
| @ant-design/icons-angular | ^20.0.0 | Icon set cho ng-zorro |
| tailwindcss | ^3.4.17 | Utility-first CSS framework |
| vitest | ^4.1.0 | Unit testing |

---

### 3.2 Cấu trúc thư mục

```
D:\đatn\
├── backend/
│   └── src/
│       ├── server.js              # Entry point: Express app, Socket.IO, Cron jobs
│       ├── config/
│       │   ├── database.js        # Kết nối MongoDB
│       │   └── db.js
│       ├── routes/                # 26 route files
│       │   ├── auth.js            ├── projects.js     ├── boards.js
│       │   ├── columns.js         ├── boardTasks.js   ├── columnTasks.js
│       │   ├── tasks.js           ├── taskActions.js  ├── comments.js
│       │   ├── notifications.js   ├── invite.js       ├── ai.js
│       │   ├── workflows.js       ├── releases.js     ├── timeline.js
│       │   ├── organizations.js   ├── departments.js  ├── portfolios.js
│       │   ├── programs.js        ├── dependencies.js ├── risks.js
│       │   ├── skills.js          ├── capacity.js     ├── timeoffs.js
│       │   ├── assignments.js     └── resourceAi.js
│       ├── controllers/           # 27 controller files
│       ├── models/                # 18 model files + softDelete plugin
│       ├── middleware/            # 14 middleware files
│       ├── services/
│       │   ├── notificationService.js    # Socket.IO notification dispatcher
│       │   └── workflowEngine.js         # State machine engine
│       ├── utils/
│       │   ├── activityLogger.js         # Fire-and-forget activity logging
│       │   ├── emailService.js           # Nodemailer invitation email
│       │   ├── ioInstance.js             # Singleton Socket.IO instance
│       │   └── workloadUtils.js          # Week calculations, burnout formula
│       └── docs/
│           └── swagger.js                # Swagger spec
│
├── frontend/
│   └── src/
│       ├── main.ts                # Bootstrap Angular app
│       ├── styles.scss            # Global styles
│       └── app/
│           ├── app.routes.ts      # Root routes (lazy loading)
│           ├── auth/              # Login, Register components
│           ├── core/
│           │   ├── guards/        # AuthGuard
│           │   ├── interceptors/  # HTTP auth interceptor (token attach + refresh)
│           │   └── services/      # TokenService, NotificationService, PermissionService
│           ├── interface/         # TypeScript interfaces (JIssue, JProject, JUser...)
│           ├── project/           # Kanban board module
│           │   ├── auth/          # AuthService, AuthStore, AuthQuery
│           │   ├── components/    # Board DnD, Issue modals, Navigation, Search...
│           │   ├── pages/         # Board, Settings, Members, Timeline, Workflow, Releases, Notifications
│           │   ├── state/         # Akita stores (project, filter, workflow, releases)
│           │   └── project.routes.ts
│           ├── organization/      # Org management module
│           ├── portfolio/         # Portfolio & Program module
│           └── resource/          # Workload, Skills, TimeOff, AI Insights
│
└── PROJECT_REVIEW.md
```

---

### 3.3 Middleware chain backend

```
Request
   │
   ▼
CORS (allow: CLIENT_URL, credentials: true)
   │
   ▼
express.json() (parse body)
   │
   ▼
Route matching
   │
   ├── Public routes (không cần auth):
   │   POST /api/auth/register → [registerRules, validate, register]
   │   POST /api/auth/login    → [loginRules, validate, login]
   │   GET  /api/invite/:token → [getByToken]
   │
   └── Protected routes:
       │
       ▼
       authMiddleware (hoặc auth.js - cả hai làm cùng việc)
          - Đọc header Authorization: Bearer <token>
          - jwt.verify(token, ACCESS_TOKEN_SECRET)
          - User.findById(decoded.userId).select('-password')
          - Attach req.user
          │
          ▼
       (tùy route)
       checkProjectMember → attach req.project, req.membership
          │
          ▼
       checkRole('owner', 'admin') → kiểm tra req.membership.role
          │
          ▼
       checkPermission('canEditTask') → owner/admin pass, member check specific flag
          │
          ▼
       orgContext → đọc X-Org-Id header, verify membership → req.organization, req.orgRole
          │
          ▼
       checkOrgRole('owner', 'admin') → kiểm tra req.orgRole
          │
          ▼
       Controller function
          │
          ▼
       Response JSON
          │
       (nếu lỗi)
          ▼
       Global error handler → 500
```

---

### 3.4 Luồng JWT

```
ĐĂNG KÝ / ĐĂNG NHẬP
   │
   ▼
Server tạo:
  accessToken  = jwt.sign({userId}, ACCESS_TOKEN_SECRET, {expiresIn: '15m'})
  refreshToken = jwt.sign({userId}, REFRESH_TOKEN_SECRET, {expiresIn: '7d'})
  RefreshToken.create({token, userId, expiresAt}) → lưu DB

Frontend:
  localStorage.setItem('accessToken', ...)
  localStorage.setItem('refreshToken', ...)

─────────────────────────────────────────────

MỌI REQUEST CÓ AUTH:
  Header: Authorization: Bearer <accessToken>
  Server: jwt.verify(token, ACCESS_TOKEN_SECRET)
         User.findById(decoded.userId)
         req.user = user

─────────────────────────────────────────────

KHI ACCESS TOKEN HẾT HẠN (15 phút):
  Server trả 401 với code: TOKEN_EXPIRED
  Frontend interceptor bắt lỗi 401
  Gọi POST /api/auth/refresh-token với {refreshToken}
  Server:
    1. jwt.verify(refreshToken, REFRESH_TOKEN_SECRET)
    2. RefreshToken.findOne({token}) → kiểm tra còn trong DB
    3. RefreshToken.deleteOne({token}) → xóa token cũ (rotation)
    4. Tạo cặp token mới → lưu DB
    5. Trả về {accessToken, refreshToken}
  Frontend:
    TokenService.setTokens(newAccessToken, newRefreshToken)
    Retry request gốc

─────────────────────────────────────────────

ĐĂNG XUẤT:
  POST /api/auth/logout với {refreshToken}
  RefreshToken.deleteOne({token}) → vô hiệu hóa
  Disconnect socket của user
  Frontend: localStorage clear, store reset

─────────────────────────────────────────────

SOCKET.IO AUTH:
  Kết nối với {auth: {token: accessToken}}
  Server middleware: jwt.verify(token)
  socket.userId = user._id.toString()
  socket.join('user_${userId}')
```

---

## PHẦN 4: REALTIME VÀ TÍCH HỢP BÊN THỨ BA

### Socket.IO Events

**Server setup:** `new SocketIOServer(httpServer, {cors: {origin: CLIENT_URL, credentials: true}})`

**Auth middleware:** JWT verify trong handshake, socket join room `user_${userId}`

#### Events server emit (to client):

| Event | Trigger | Payload | File |
|-------|---------|---------|------|
| `notification` | Mọi lúc có notification mới | `{id, type, title, body, link, isRead, createdAt}` | `notificationService.js` |
| `task_deleted` | Khi task bị xóa | `{taskId, deletedBy: {id, name}, title}` | `taskController.js` |
| `task_state_changed` | Sau khi workflow transition thành công | `{taskId, oldStateId, newStateId, stateName, updatedBy}` | `workflowEngine.js` |
| `task_rescheduled` | Sau khi reschedule task trên timeline | `{taskId, startDate, dueDate, updatedBy: {id, name}}` | `timelineController.js` |

#### Events client listen:

| Event | Frontend handler | Tác dụng |
|-------|-----------------|---------|
| `notification` | `NotificationService._socket.on('notification', ...)` | Tăng unread count, hiển thị toast |
| `task_deleted` | `NotificationService.taskDeleted$.next(event)` | Xóa task khỏi board realtime |

**Frontend connect:** `io(wsUrl, {auth: {token}, transports: ['websocket'], reconnection: true, reconnectionDelay: 2000})`

---

### AI Integration

Dự án sử dụng **3 AI provider** khác nhau:

#### 1. Groq SDK (`groq-sdk`) - Model: `llama-3.3-70b-versatile`
- **Dùng cho:** Project AI summary/predict/report, Suggest deadline, Resource AI (recommend assignee, rebalance, burnout prediction), Portfolio AI (health check, risk prediction)
- **Config:** `new Groq({apiKey: process.env.GROQ_API_KEY})`
- **Params:** `{model: MODEL, messages, temperature: 0.3-0.7, max_tokens: 800-2048}`
- **JSON mode:** `response_format: {type: 'json_object'}` cho structured output
- **Error handling:** Rate limit (429) → 503; Invalid key (401) → 502

#### 2. Google Generative AI (`@google/generative-ai`) - Model: `gemini-1.5-flash`
- **Dùng cho:** Workflow AI analysis, Timeline AI resolve conflict
- **Config:** `new GoogleGenerativeAI(process.env.GEMINI_API_KEY)`
- **Method:** `model.generateContent(prompt)` → parse JSON từ text bằng regex `\{[\s\S]*\}`
- **Fallback:** Nếu parse JSON fail → trả về raw text

#### 3. Anthropic Claude SDK (`@anthropic-ai/sdk`)
- **Có trong package.json** nhưng **không thấy sử dụng** trong source code đọc được - có thể là dependency dự phòng hoặc feature chưa implement

---

### Email (Nodemailer)

**Config:**
```
MAIL_HOST=smtp.gmail.com (hoặc provider khác)
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=app_password
MAIL_PORT=587
MAIL_FROM="Project Manager" <email>
```

**Chỉ sử dụng cho:** Gửi email mời thành viên project (`sendInvitationEmail`)

**Template:** HTML đầy đủ với nút Accept/Reject, badge role, footer, hỗ trợ tiếng Việt

**Dev mode:** Nếu SMTP chưa cấu hình → log ra console (không throw error)

---

### Cron Jobs (sử dụng `setInterval` thuần)

| Cron | Trigger | Mục đích |
|------|---------|---------|
| `scheduleInvitationExpiry` | Mỗi 1 giờ | Cập nhật invitation `pending → expired` nếu quá `expiredAt` |
| `scheduleDeadlineNotifications` | Mỗi 1 giờ | Notify task sắp đến hạn (24h) và đã quá hạn (1h trước) |
| `scheduleSlaCheck` | Mỗi 1 giờ | Kiểm tra SLA breach, set `slaBreached=true`, notify owner + assignee |
| `scheduleWeeklyWorkloadSnapshot` | Mỗi 1 giờ (chỉ Chủ nhật 23:xx) | Lưu WorkloadSnapshot, cảnh báo burnout |
| `scheduleCapacityCheck` | Mỗi 1 giờ (chỉ 8AM) | Cảnh báo người nghỉ phép có task đến hạn ngày mai |

**Lưu ý:** Tất cả cron đều dùng `setInterval(fn, 3_600_000)` thay vì cron library. Các cron có điều kiện (Sunday 23:xx, 8AM) check `now.getDay()` và `now.getHours()` bên trong hàm.

---

## PHẦN 5: BẢNG API ENDPOINTS

### Auth

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| POST | /api/auth/register | registerRules, validate | register | Đăng ký tài khoản mới |
| POST | /api/auth/login | loginRules, validate | login | Đăng nhập, trả về token |
| POST | /api/auth/logout | - | logout | Đăng xuất, xóa refresh token |
| POST | /api/auth/refresh-token | - | refreshToken | Làm mới access token (token rotation) |
| GET | /api/auth/me | auth | getMe | Lấy thông tin user hiện tại |
| PUT | /api/auth/profile | auth | updateProfile | Cập nhật tên, avatar |
| PUT | /api/auth/change-password | auth, changePasswordRules, validate | changePassword | Đổi mật khẩu, revoke tất cả session |

### Notifications

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/notifications | auth | list | Danh sách notification (phân trang, filter unread) |
| GET | /api/notifications/unread-count | auth | unreadCount | Đếm số thông báo chưa đọc |
| PUT | /api/notifications/read-all | auth | markAllRead | Đánh dấu tất cả đã đọc |
| PUT | /api/notifications/:id/read | auth | markRead | Đánh dấu 1 notification đã đọc |
| DELETE | /api/notifications/:id | auth | remove | Xóa notification |

### Organizations

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/organizations/my | auth | getMyOrganizations | Danh sách org của user |
| POST | /api/organizations | auth | createOrganization | Tạo organization mới |
| POST | /api/organizations/:id/switch | auth | switchOrganization | Chuyển sang org, lấy role |
| GET | /api/organizations/:id | auth, orgContext | getOrganization | Chi tiết org |
| PUT | /api/organizations/:id | auth, orgContext, checkOrgRole(owner/admin) | updateOrganization | Cập nhật org |
| DELETE | /api/organizations/:id | auth, orgContext, checkOrgRole(owner) | deleteOrganization | Xóa (soft) org |
| POST | /api/organizations/:id/transfer-ownership | auth, orgContext, checkOrgRole(owner) | transferOwnership | Chuyển quyền sở hữu |
| GET | /api/organizations/:orgId/departments | auth, orgContext | getDepartments | Danh sách phòng ban |
| POST | /api/organizations/:orgId/departments | auth, orgContext, checkOrgRole(owner/admin) | createDepartment | Tạo phòng ban |
| GET | /api/organizations/:id/members | auth, orgContext | getMembers | Danh sách thành viên org |
| POST | /api/organizations/:id/members/invite | auth, orgContext, checkOrgRole(owner/admin/dept_head) | inviteMember | Mời thành viên vào org |
| POST | /api/organizations/:id/members/bulk-invite | auth, orgContext, checkOrgRole(owner/admin) | bulkInvite | Mời nhiều thành viên cùng lúc |
| PUT | /api/organizations/:orgId/members/:userId | auth, orgContext, checkOrgRole(owner/admin) | updateMember | Cập nhật role/department thành viên |
| DELETE | /api/organizations/:orgId/members/:userId | auth, orgContext, checkOrgRole(owner/admin) | removeMember | Xóa thành viên khỏi org |
| POST | /api/organizations/:orgId/members/:userId/suspend | auth, orgContext, checkOrgRole(owner/admin) | suspendMember | Tạm đình chỉ thành viên |
| POST | /api/organizations/:orgId/members/:userId/activate | auth, orgContext, checkOrgRole(owner/admin) | activateMember | Kích hoạt lại thành viên |

### Departments

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| PUT | /api/departments/:id | auth, orgContext | updateDepartment | Cập nhật phòng ban |
| DELETE | /api/departments/:id | auth, orgContext | deleteDepartment | Xóa phòng ban |
| GET | /api/departments/:id/members | auth, orgContext | getDepartmentMembers | Thành viên trong phòng ban |

### Projects

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/projects/search | auth | searchProjects | Tìm kiếm dự án (query: q) |
| GET | /api/projects/my-projects | auth | getMyProjects | Danh sách dự án + memberCount + lastAccessedAt |
| GET | /api/projects | auth | getProjects | Tất cả dự án của user |
| POST | /api/projects | auth | createProject | Tạo dự án, auto add owner |
| GET | /api/projects/:id | auth, checkProjectMember | getProject | Chi tiết dự án + members |
| PUT | /api/projects/:id | auth, checkProjectMember, checkRole(owner/admin) | updateProject | Cập nhật dự án |
| DELETE | /api/projects/:id | auth, checkProjectMember, checkRole(owner) | deleteProject | Soft delete dự án |
| PUT | /api/projects/:id/last-accessed | auth, checkProjectMember | updateLastAccessed | Cập nhật lần truy cập cuối |
| GET | /api/projects/:id/members | auth, checkProjectMember | getMembers | Danh sách thành viên project |
| POST | /api/projects/:id/members | auth, checkProjectMember, checkRole(owner/admin) | addMember | Thêm thành viên |
| PUT | /api/projects/:id/members/:userId | auth, checkProjectMember, checkRole(owner) | updateMemberRole | Đổi role thành viên |
| PUT | /api/projects/:id/members/:userId/permissions | auth, checkProjectMember, checkRole(owner) | updateMemberPermissions | Cập nhật permissions thành viên |
| GET | /api/projects/:id/my-permissions | auth, checkProjectMember | getMyPermissions | Lấy permission của mình |
| DELETE | /api/projects/:id/members/:userId | auth, checkProjectMember, checkRole(owner/admin) | removeMember | Xóa thành viên |
| GET | /api/projects/:id/invitations | auth, checkProjectMember, checkRole(owner/admin) | getInvitations | Danh sách invitation |
| POST | /api/projects/:id/invitations | auth, checkProjectMember, checkRole(owner/admin) | createInvitation | Tạo invitation + gửi email |
| DELETE | /api/projects/:id/invitations/:invitationId | auth, checkProjectMember, checkRole(owner/admin) | deleteInvitation | Hủy invitation |

### Boards

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/projects/:projectId/boards | auth, requireRole() | getBoards | Danh sách board |
| POST | /api/projects/:projectId/boards | auth, requireRole(owner/admin) | createBoard | Tạo board |
| GET | /api/projects/:projectId/boards/:boardId | auth, requireRole() | getBoard | Board + columns + tasks |
| PATCH | /api/projects/:projectId/boards/:boardId | auth, requireRole(owner/admin) | updateBoard | Cập nhật board |
| DELETE | /api/projects/:projectId/boards/:boardId | auth, requireRole(owner/admin) | deleteBoard | Xóa board |

### Columns

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/projects/:projectId/boards/:boardId/columns | auth, requireRole() | getColumns | Danh sách column |
| POST | /api/projects/:projectId/boards/:boardId/columns | auth, requireRole(owner/admin) | createColumn | Tạo column |
| PATCH | /api/projects/:projectId/boards/:boardId/columns/:columnId | auth, requireRole(owner/admin) | updateColumn | Đổi tên column |
| PUT | /api/projects/:projectId/boards/:boardId/columns/:columnId/move | auth, requireRole() | moveColumn | Di chuyển column (reorder) |
| DELETE | /api/projects/:projectId/boards/:boardId/columns/:columnId | auth, requireRole(owner/admin) | deleteColumn | Xóa column |

### Tasks

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/boards/:boardId/tasks | auth | getBoardTasks | Tất cả task của board (grouped by column, có filter) |
| GET | /api/columns/:columnId/tasks | auth | getColumnTasks | Task trong column |
| POST | /api/columns/:columnId/tasks | auth, checkColumn | createTask | Tạo task, log activity, notify assignee |
| GET | /api/tasks/:id | auth, checkTask | getTask | Chi tiết task |
| PUT | /api/tasks/:id | auth, checkTask, checkPermission(canEditTask) | updateTask | Cập nhật task + activity log |
| DELETE | /api/tasks/:id | auth, checkTask | deleteTask | Soft delete, reorder, notify, socket emit |
| PUT | /api/tasks/:id/move | auth, checkTask, checkPermission(canDragTask) | moveTask | Move giữa column/vị trí |
| GET | /api/tasks/:taskId/comments | auth, checkTaskAccess | getComments | Comments của task |
| POST | /api/tasks/:taskId/comments | auth, checkTaskAccess | createComment | Tạo comment |
| GET | /api/tasks/:taskId/activities | auth, checkTaskAccess | getActivities | Activity log của task |
| GET | /api/tasks/:taskId/feed | auth, checkTaskAccess | getFeed | Feed (activities + comments) |

### Comments

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| PUT | /api/comments/:id | auth, checkCommentOwner | updateComment | Sửa comment (chỉ author) |
| DELETE | /api/comments/:id | auth, checkCommentOwner | deleteComment | Xóa comment (chỉ author) |

### Invitations (Public)

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/invite/:token | - | getByToken | Lấy info invitation qua token |
| POST | /api/invite/:token/accept | auth | acceptToken | Chấp nhận lời mời (phải đăng nhập) |
| POST | /api/invite/:token/reject | - | rejectToken | Từ chối (không cần auth) |

### AI (Projects)

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/projects/:id/ai/summary | auth, checkProjectMember | getSummary | AI phân tích tiến độ dự án |
| GET | /api/projects/:id/ai/statistics | auth, checkProjectMember | getStatistics | Thống kê task theo cột/priority/assignee |
| POST | /api/projects/:id/ai/predict | auth, checkProjectMember | predict | AI dự đoán khả năng hoàn thành deadline |
| POST | /api/projects/:id/ai/report | auth, checkProjectMember | generateReport | AI tạo báo cáo Markdown đầy đủ |
| POST | /api/tasks/:id/suggest-deadline | auth, checkTask, checkPermission(canEditTask) | suggestDeadline | AI gợi ý deadline |

### Workflows

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/projects/:projectId/workflows | auth | listWorkflows | Danh sách workflow + task count |
| POST | /api/projects/:projectId/workflows | auth | createWorkflow | Tạo workflow (chỉ owner) + validation |
| GET | /api/workflows/:id | auth | getWorkflow | Chi tiết + stats (avgHoursByState) |
| PUT | /api/workflows/:id | auth | updateWorkflow | Cập nhật (chỉ owner) |
| DELETE | /api/workflows/:id | auth | deleteWorkflow | Xóa (chỉ owner, không có task nào dùng) |
| POST | /api/workflows/:id/clone | auth | cloneWorkflow | Sao chép workflow với ID mới |
| POST | /api/workflows/:id/ai/analyze | auth | aiAnalyzeWorkflow | AI phân tích workflow (Gemini) |
| GET | /api/tasks/:id/available-transitions | auth, checkTask | getAvailableTransitions | Transitions có thể thực hiện |
| GET | /api/tasks/:id/state-history | auth, checkTask | getStateHistory | Lịch sử đổi trạng thái |
| POST | /api/tasks/:id/transitions | auth, checkTask | executeTaskTransition | Thực hiện transition (có thể pending approval) |
| POST | /api/tasks/:id/approve | auth, checkTask | approveTaskTransition | Phê duyệt/từ chối transition |
| POST | /api/tasks/:id/assign-workflow | auth, checkTask | assignWorkflow | Gán workflow cho task |

### Timeline

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/timeline/projects | auth | getTimelineProjects | Dự án của user (owner/admin only) với stats |
| GET | /api/timeline/tasks | auth | getTimelineTasks | Tasks theo projectIds, mapped cho Gantt |
| PUT | /api/timeline/tasks/:id/reschedule | auth | rescheduleTask | Reschedule qua Gantt drag |
| GET | /api/timeline/conflicts | auth | getConflicts | Phát hiện overdue/overlap/blocked |
| GET | /api/timeline/critical-path/:projectId | auth | getCriticalPath | Tính critical path (CPM algorithm) |
| POST | /api/timeline/ai/resolve-conflict | auth | aiResolveConflict | AI đề xuất giải pháp xung đột (Gemini) |

### Releases

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/releases/overview | auth | getOverview | Tổng quan tất cả project + task stats + latest release |
| GET | /api/releases/timeline | auth | getTimeline | Danh sách release theo thời gian |
| GET | /api/releases/statistics | auth | getStatistics | Thống kê release theo tháng, top project |
| PUT | /api/releases/:id | auth | updateRelease | Cập nhật release notes/status |
| GET | /api/projects/:id/releases | auth | getProjectReleases | Releases của project (phân trang) |
| POST | /api/projects/:id/releases | auth | createRelease | Tạo release, notify members |
| POST | /api/projects/:id/status | auth | changeProjectStatus | Đổi project lifecycle status |
| GET | /api/projects/:id/suggest-version | auth | suggestVersion | Gợi ý phiên bản kế tiếp |
| GET | /api/projects/:id/done-tasks | auth | getDoneTasks | Tasks hoàn thành chưa thuộc release nào |

### Portfolios

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/portfolios | auth, orgContext | list | Danh sách portfolio của org |
| POST | /api/portfolios | auth, orgContext | create | Tạo portfolio |
| GET | /api/portfolios/:id | auth, orgContext | getOne | Chi tiết portfolio |
| PUT | /api/portfolios/:id | auth, orgContext | update | Cập nhật portfolio |
| DELETE | /api/portfolios/:id | auth, orgContext | remove | Soft delete portfolio |
| GET | /api/portfolios/:id/dashboard | auth, orgContext | dashboard | Dashboard: stats, riskCounts, avgProgress |
| GET | /api/portfolios/:id/roadmap | auth, orgContext | roadmap | Programs + Projects với dates |
| GET | /api/portfolios/:id/dependencies | auth, orgContext | dependencies | Project dependencies trong portfolio |
| GET | /api/portfolios/:id/risk-matrix | auth, orgContext | riskMatrix | 5x5 risk matrix |
| GET | /api/portfolios/:portfolioId/programs | auth, orgContext | listByPortfolio | Programs trong portfolio |
| POST | /api/portfolios/:portfolioId/programs | auth, orgContext | create (program) | Tạo program |
| POST | /api/portfolios/:id/ai/health-check | auth, orgContext | healthCheck | AI đánh giá sức khỏe portfolio (Groq) |
| POST | /api/portfolios/:id/ai/risk-prediction | auth, orgContext | riskPrediction | AI dự báo rủi ro mới (Groq) |

### Programs

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/programs | auth | list | Danh sách programs |
| GET | /api/programs/:id | auth | getOne | Chi tiết program |
| PUT | /api/programs/:id | auth | update | Cập nhật program |
| DELETE | /api/programs/:id | auth | remove | Soft delete program |

### Risks

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/risks | auth | list | Danh sách risks (filter theo scopeType/scopeId) |
| POST | /api/risks | auth | create | Tạo risk, auto-calc riskScore |
| GET | /api/risks/:id | auth | getOne | Chi tiết risk |
| PUT | /api/risks/:id | auth | update | Cập nhật risk |
| DELETE | /api/risks/:id | auth | remove | Soft delete risk |

### Dependencies

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| POST | /api/dependencies | auth | create | Tạo project dependency |
| DELETE | /api/dependencies/:id | auth | remove | Xóa dependency |

### Skills

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/skills | auth | listSkills | Danh sách kỹ năng (filter category/search) |
| POST | /api/skills | auth | createSkill | Tạo kỹ năng mới |
| POST | /api/skills/seed | auth | seedSkills | Seed 55+ kỹ năng mặc định |
| GET | /api/skills/users/:userId/skills | auth | getUserSkills | Kỹ năng của user |
| PUT | /api/skills/users/:userId/skills | auth | updateUserSkills | Cập nhật danh sách kỹ năng |
| DELETE | /api/skills/users/:userId/skills/:skillId | auth | removeUserSkill | Xóa kỹ năng |
| POST | /api/skills/users/:userId/skills/:skillId/endorse | auth | endorseSkill | Endorse kỹ năng của người khác |
| GET | /api/skills/organizations/:orgId/skills-matrix | auth, orgContext | getOrgSkillsMatrix | Ma trận kỹ năng toàn org |

### Capacity & Workload

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/users/:userId/capacity | auth | getUserCapacity | Thông tin capacity user |
| PUT | /api/users/:userId/capacity | auth | updateUserCapacity | Cập nhật giờ/ngày làm việc |
| GET | /api/users/:userId/workload | auth | getUserWorkload | Workload theo tuần (8 tuần) |
| GET | /api/projects/:projectId/workload | auth | getProjectWorkload | Workload team trong project |
| GET | /api/organizations/:orgId/capacity-overview | auth, orgContext | getOrgCapacityOverview | Overview capacity toàn org |

### Time Off

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/timeoffs/my | auth | listMine | Nghỉ phép của user hiện tại |
| GET | /api/timeoffs | auth | list | Tất cả nghỉ phép |
| POST | /api/timeoffs | auth | create | Tạo yêu cầu nghỉ phép |
| PUT | /api/timeoffs/:id/approve | auth | approve | Phê duyệt nghỉ phép |
| PUT | /api/timeoffs/:id/reject | auth | reject | Từ chối nghỉ phép |
| PUT | /api/timeoffs/:id/cancel | auth | cancel | Huỷ nghỉ phép |
| GET | /api/timeoffs/organizations/:orgId/calendar | auth, orgContext | getOrgCalendar | Lịch nghỉ toàn org |

### Assignments

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/tasks/:taskId/assignments | auth | list | Danh sách assignment của task |
| POST | /api/tasks/:taskId/assignments | auth | create | Tạo assignment với giờ phân bổ |
| PUT | /api/assignments/:id | auth | update | Cập nhật assignment |
| POST | /api/assignments/:id/log-time | auth | logTime | Log giờ thực tế |
| POST | /api/tasks/:taskId/ai/recommend-assignee | auth | recommendAssignee | AI gợi ý top 3 người thực hiện |
| POST | /api/projects/:projectId/ai/rebalance | auth | rebalanceWorkload | AI đề xuất rebalance workload team |

### Resource AI

| Method | Endpoint | Middleware | Controller | Mô tả |
|--------|----------|-----------|-----------|-------|
| GET | /api/organizations/:orgId/ai/burnout-prediction | auth, orgContext | burnoutPrediction | AI dự báo burnout toàn org |

---

## TỔNG KẾT

| Mục | Số lượng |
|-----|---------|
| Tổng số chức năng chính | 30 |
| Tổng số API endpoint | ~95 |
| Tổng số MongoDB collection | 17 |
| Route files (backend) | 26 |
| Controller files (backend) | 27 |
| Model files (backend) | 17 (+ 1 index.js + 1 plugin) |
| Middleware files (backend) | 14 |
| Component files (frontend) | ~60+ |
| Service files (frontend) | 8 |
| AI providers tích hợp | 3 (Groq, Google Gemini, Anthropic SDK) |
| Socket.IO events | 4 server→client events |
| Cron jobs | 5 |
| Ước lượng dòng code backend | ~6,000 - 7,000 dòng |
| Ước lượng dòng code frontend | ~5,000 - 6,000 dòng |

### Điểm mạnh của hệ thống

1. **Multi-tenant**: Hỗ trợ đầy đủ Organization → Department → Project hierarchy
2. **AI tích hợp sâu**: 9 AI features với 3 provider (Groq LLaMA, Gemini, Anthropic)
3. **Real-time**: Socket.IO với JWT auth, room-based notification
4. **Workflow engine**: State machine đầy đủ với SLA, approval flow, auto actions
5. **Resource management**: Workload tracking, burnout prediction, skills matrix
6. **Clean architecture**: Middleware chain rõ ràng, soft delete pattern nhất quán, activity logging

### Ghi chú kỹ thuật

- Platform: Windows 11 Pro
- Database: MongoDB (local hoặc Atlas)
- Backend chạy trên port 3000, Frontend Angular dev server port 4200
- Tất cả timestamp được xử lý theo timezone UTC trong DB, frontend hiển thị local time
- Soft delete pattern dùng `deletedAt: null` với Mongoose pre-query hook
- Token rotation: mỗi lần refresh tạo cặp token mới, xóa token cũ → prevent token reuse

⚠️ **CHƯA HOÀN THIỆN / CÒN HẠN CHẾ:**
- `@anthropic-ai/sdk` có trong dependencies nhưng không thấy sử dụng trong code (có thể feature chưa implement)
- Cron jobs dùng `setInterval` thay vì cron library (sẽ reset nếu server restart)
- SMTP email chưa được cấu hình mặc định (dev mode log ra console)
- Chưa có unit/integration test coverage cho backend
- Frontend `WorkflowAiInsightsComponent` có nhưng cần xem thêm về integration với backend
- `taskActions.js` route file tồn tại nhưng không được mount trong server.js

---

*Tài liệu này được tạo tự động từ phân tích source code thực tế ngày 18/06/2026.*
*Mọi thông tin đều được trích xuất trực tiếp từ file code, không suy đoán.*
