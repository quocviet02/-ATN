# Sơ đồ Sequence Diagram – Hệ thống Quản lý Dự án

> Tất cả sơ đồ sử dụng cú pháp PlantUML.
> Render bằng: `java -jar plantuml.jar SEQUENCE_DIAGRAMS.md` hoặc paste vào https://www.plantuml.com/plantuml/

---

## MỤC LỤC

| # | Sơ đồ | Luồng chính |
|---|-------|-------------|
| SD01 | [Đăng nhập hệ thống](#sd01-đăng-nhập-hệ-thống) | POST /auth/login → JWT |
| SD02 | [Đăng ký tài khoản](#sd02-đăng-ký-tài-khoản) | POST /auth/register |
| SD03 | [Tạo task mới](#sd03-tạo-task-mới) | POST /tasks → Board update |
| SD04 | [Di chuyển task (Drag & Drop)](#sd04-di-chuyển-task-drag--drop) | PUT /tasks/:id → reorder |
| SD05 | [Bình luận trên task](#sd05-bình-luận-trên-task) | POST /tasks/:id/comments |
| SD06 | [Mời thành viên vào dự án](#sd06-mời-thành-viên-vào-dự-án) | POST /invitations → accept |
| SD07 | [Luồng thông báo (Notification)](#sd07-luồng-thông-báo) | Polling + mark as read |
| SD08 | [AI gợi ý deadline](#sd08-ai-gợi-ý-deadline) | POST /suggest-deadline → Gemini |
| SD09 | [Xóa task](#sd09-xóa-task) | DELETE /tasks/:id → cascade |
| SD10 | [Cronjob thông báo deadline tự động](#sd10-cronjob-thông-báo-deadline-tự-động) | Cron → due_soon & overdue |

---

## SD01: Đăng nhập hệ thống

```plantuml
@startuml SD01_DangNhap
title Sequence Diagram 01 – Đăng nhập hệ thống

skinparam backgroundColor #FAFAFA
skinparam sequenceArrowThickness 2
skinparam ParticipantPadding 20
skinparam BoxPadding 10

actor "Người dùng" as U
participant "Angular\nFrontend" as FE
participant "Node.js\nBackend" as BE
database "MongoDB" as DB

autonumber

U -> FE : Nhập email & password\nNhấn "Đăng nhập"
FE -> FE : Validate form\n(email format, không rỗng)

alt Form không hợp lệ
  FE --> U : Hiển thị lỗi validation\ndưới field
else Form hợp lệ
  FE -> BE : POST /auth/login\n{ email, password }
  BE -> DB : User.findOne({ email })
  DB --> BE : User document (hoặc null)

  alt User không tồn tại
    BE --> FE : 401 Unauthorized\n"Tài khoản không tồn tại"
    FE --> U : Hiển thị thông báo lỗi
  else User tồn tại
    BE -> BE : bcrypt.compare(password, user.passwordHash)

    alt Mật khẩu sai
      BE --> FE : 401 Unauthorized\n"Mật khẩu không đúng"
      FE --> U : Hiển thị thông báo lỗi
    else Mật khẩu đúng
      BE -> BE : jwt.sign({ userId, email })\n(accessToken, expiresIn: 15m)
      BE --> FE : 200 OK\n{ user, accessToken }
      FE -> FE : Lưu token vào localStorage
      FE -> FE : Cập nhật AuthStore (Akita)
      FE --> U : Redirect đến /project
    end
  end
end

@enduml
```

---

## SD02: Đăng ký tài khoản

```plantuml
@startuml SD02_DangKy
title Sequence Diagram 02 – Đăng ký tài khoản

skinparam backgroundColor #FAFAFA
skinparam sequenceArrowThickness 2
skinparam ParticipantPadding 20

actor "Khách\n(Guest)" as G
participant "Angular\nFrontend" as FE
participant "Node.js\nBackend" as BE
database "MongoDB" as DB

autonumber

G -> FE : Nhập name, email, password\nNhấn "Đăng ký"
FE -> FE : Validate form\n(email format, password ≥ 8 ký tự)

alt Form không hợp lệ
  FE --> G : Hiển thị lỗi validation
else Form hợp lệ
  FE -> BE : POST /auth/register\n{ name, email, password }
  BE -> DB : User.findOne({ email })
  DB --> BE : Kết quả tìm kiếm

  alt Email đã tồn tại
    BE --> FE : 409 Conflict\n"Email đã được sử dụng"
    FE --> G : Hiển thị thông báo lỗi
  else Email chưa tồn tại
    BE -> BE : bcrypt.hash(password, saltRounds)
    BE -> DB : User.create({ name, email,\n  passwordHash })
    DB --> BE : User document mới (_id, name, email)
    BE -> BE : jwt.sign({ userId, email })\n(accessToken)
    BE --> FE : 201 Created\n{ user, accessToken }
    FE -> FE : Lưu token vào localStorage
    FE -> FE : Cập nhật AuthStore (Akita)
    FE --> G : Redirect đến /project
  end
end

@enduml
```

---

## SD03: Tạo task mới

```plantuml
@startuml SD03_TaoTask
title Sequence Diagram 03 – Tạo task mới

skinparam backgroundColor #FAFAFA
skinparam sequenceArrowThickness 2
skinparam ParticipantPadding 20

actor "Thành viên" as M
participant "Angular\nFrontend" as FE
participant "Node.js\nBackend" as BE
database "MongoDB" as DB

autonumber

M -> FE : Nhấn "+ Tạo task" (Navbar/Board)
FE -> FE : Mở AddIssueModal
FE --> M : Hiển thị form\n(tiêu đề, loại, ưu tiên, assignee)
M -> FE : Điền thông tin, nhấn "Tạo"
FE -> FE : Validate: tiêu đề không rỗng

alt Validation thất bại
  FE --> M : Hiển thị "Vui lòng nhập tiêu đề"
else Hợp lệ
  FE -> BE : POST /tasks\n{ title, type, priority,\n  assigneeId, projectId }
  note right of BE : Header: Authorization: Bearer <token>

  BE -> BE : Xác thực JWT (verifyToken)
  BE -> DB : ProjectMember.findOne\n({ userId, projectId })
  DB --> BE : Document thành viên & role

  alt Không phải thành viên dự án
    BE --> FE : 403 Forbidden
    FE --> M : Hiển thị thông báo lỗi quyền
  else Là thành viên hợp lệ
    BE -> DB : List.findOne\n({ projectId, name: 'Backlog' })
    DB --> BE : list._id (cột Backlog)

    BE -> DB : Task.findOne\n({ listId }, { sort: { listPosition: -1 } })
    DB --> BE : Task có listPosition cao nhất

    BE -> DB : Task.create\n({ title, type, priority, assigneeId,\n  listId, listPosition: max + 1,\n  reporterId })
    DB --> BE : Task document mới

    BE -> DB : Activity.create\n({ taskId, userId,\n  type: 'TASK_CREATED',\n  body: '[user] created this task' })

    opt Có assigneeId và assigneeId !== reporterId
      BE -> DB : Notification.create\n({ userId: assigneeId,\n  type: 'TASK_ASSIGNED', taskId })
    end

    DB --> BE : OK
    BE --> FE : 201 Created\n{ task object }
    FE -> FE : Cập nhật ProjectStore (Akita)
    FE -> FE : Thêm task vào cột Backlog trên UI
    FE -> FE : Đóng modal
    FE --> M : Task mới hiển thị trên Board
  end
end

@enduml
```

---

## SD04: Di chuyển task (Drag & Drop)

```plantuml
@startuml SD04_DiChuyenTask
title Sequence Diagram 04 – Di chuyển task giữa các cột (Drag & Drop)

skinparam backgroundColor #FAFAFA
skinparam sequenceArrowThickness 2
skinparam ParticipantPadding 20

actor "Thành viên" as M
participant "Angular\nFrontend" as FE
participant "Node.js\nBackend" as BE
database "MongoDB" as DB

autonumber

M -> FE : Kéo task từ cột nguồn\nsang cột đích (cdkDrop)
FE -> FE : Xử lý sự kiện cdkDropListDropped
FE -> FE : Tính toán listId đích\nvà listPosition mới
FE -> FE : Optimistic update:\ncập nhật UI ngay lập tức

FE -> BE : PUT /tasks/:id\n{ listId, listPosition }
note right of BE : Header: Authorization: Bearer <token>

BE -> BE : Xác thực JWT
BE -> DB : Task.findById(taskId)
DB --> BE : Task document

BE -> DB : ProjectMember.findOne\n({ userId, projectId: task.projectId })
DB --> BE : Thông tin quyền (canDragTask)

alt Không có quyền hoặc task không thuộc dự án
  BE --> FE : 403 Forbidden / 404 Not Found
  FE -> FE : Hoàn tác UI về vị trí cũ
  FE --> M : Hiển thị thông báo lỗi
else Hợp lệ
  BE -> DB : Task.findByIdAndUpdate(id,\n{ $set: { listId, listPosition } })

  BE -> DB : Task.updateMany\n({ listId: listId_dich,\n  listPosition: { $gte: listPosition } },\n{ $inc: { listPosition: 1 } })
  DB --> BE : OK

  BE -> DB : Activity.create\n({ type: 'TASK_MOVED',\n  body: '[user] moved task\n  from [cột cũ] to [cột mới]' })

  opt Có assigneeId và assigneeId !== userId
    BE -> DB : Notification.create\n({ userId: assigneeId,\n  type: 'TASK_STATUS_CHANGED' })
  end

  DB --> BE : OK
  BE --> FE : 200 OK\n{ task đã cập nhật }
  FE -> FE : Xác nhận thay đổi trong ProjectStore
  FE --> M : Task hiển thị đúng cột mới
end

@enduml
```

---

## SD05: Bình luận trên task

```plantuml
@startuml SD05_BinhLuan
title Sequence Diagram 05 – Thêm bình luận vào task

skinparam backgroundColor #FAFAFA
skinparam sequenceArrowThickness 2
skinparam ParticipantPadding 20

actor "Thành viên" as M
participant "Angular\nFrontend" as FE
participant "Node.js\nBackend" as BE
database "MongoDB" as DB

autonumber

M -> FE : Mở chi tiết task
FE -> BE : GET /tasks/:id
BE --> FE : Task detail + comments + activities
FE --> M : Hiển thị trang chi tiết task

M -> FE : Nhập nội dung bình luận\n(Quill rich-text editor)
M -> FE : Nhấn "Lưu"

FE -> FE : Kiểm tra nội dung không rỗng

alt Nội dung rỗng
  FE --> M : Không làm gì (bỏ qua)
else Có nội dung
  FE -> BE : POST /tasks/:id/comments\n{ body: "<html>..." }
  note right of BE : Header: Authorization: Bearer <token>

  BE -> BE : Xác thực JWT
  BE -> DB : ProjectMember.findOne\n({ userId, projectId: task.projectId })
  DB --> BE : Kiểm tra quyền thành viên

  alt Không phải thành viên
    BE --> FE : 403 Forbidden
    FE --> M : Hiển thị lỗi quyền
  else Là thành viên hợp lệ
    BE -> DB : Comment.create\n({ taskId, userId, body, createdAt: Date.now() })
    DB --> BE : Comment document mới

    BE -> DB : Activity.create\n({ taskId, type: 'COMMENT_CREATED',\n  body: '[user] commented: ...' })

    BE -> DB : Comment.distinct('userId', { taskId })\n+ task.assigneeId + task.reporterId
    DB --> BE : Danh sách watchers (loại trừ commenter)

    loop Mỗi watcher
      BE -> DB : Notification.create\n({ userId: watcherId,\n  type: 'COMMENT_ADDED',\n  title: '[user] commented on task' })
    end

    DB --> BE : OK
    BE --> FE : 201 Created\n{ comment object }
    FE -> FE : Thêm comment vào danh sách trên UI
    FE -> FE : Reset ô nhập (Quill editor)
    FE --> M : Thấy bình luận vừa đăng
  end
end

@enduml
```

---

## SD06: Mời thành viên vào dự án

```plantuml
@startuml SD06_MoiThanhVien
title Sequence Diagram 06 – Mời thành viên vào dự án

skinparam backgroundColor #FAFAFA
skinparam sequenceArrowThickness 2
skinparam ParticipantPadding 20

actor "Admin / Owner" as A
actor "Người được mời" as I
participant "Angular\nFrontend" as FE
participant "Node.js\nBackend" as BE
database "MongoDB" as DB

autonumber

== Gửi lời mời ==

A -> FE : Vào trang Members\nNhập email + chọn role\nNhấn "Gửi lời mời"
FE -> FE : Validate email format

alt Email không hợp lệ
  FE --> A : Hiển thị lỗi định dạng
else Email hợp lệ
  FE -> BE : POST /projects/:id/invitations\n{ email, role }

  BE -> BE : Xác thực JWT + kiểm tra\nrole Admin/Owner

  alt Không đủ quyền
    BE --> FE : 403 Forbidden
    FE --> A : Thông báo lỗi quyền
  else Có quyền
    BE -> DB : User.findOne({ email })
    DB --> BE : User document (hoặc null)

    alt User không tồn tại
      BE --> FE : 404 Not Found
      FE --> A : "Tài khoản không tồn tại"
    else User tồn tại
      BE -> DB : ProjectMember.findOne\n({ userId: invitee._id, projectId })
      DB --> BE : Kết quả kiểm tra thành viên

      alt Đã là thành viên
        BE --> FE : 409 Conflict
        FE --> A : "Email đã là thành viên dự án"
      else Chưa là thành viên
        BE -> DB : Invitation.create\n({ projectId, inviteeId, role,\n  status: 'pending',\n  expiredAt: Date.now() + 7*24h })
        DB --> BE : Invitation document mới

        BE -> DB : Notification.create\n({ userId: inviteeId,\n  type: 'PROJECT_INVITATION' })
        DB --> BE : OK
        BE --> FE : 201 Created\n{ invitation object }
        FE -> FE : Cập nhật danh sách lời mời pending
        FE --> A : Thấy lời mời đang chờ xác nhận
      end
    end
  end
end

== Người được mời phản hồi ==

I -> FE : Nhận thông báo lời mời\nNhấn vào thông báo

alt Chấp nhận lời mời
  FE -> BE : PATCH /invitations/:id/accept
  BE -> DB : Invitation.findByIdAndUpdate(id,\n{ $set: { status: 'accepted' } })
  BE -> DB : ProjectMember.create\n({ userId, projectId, role })
  BE -> DB : Notification.create\n({ userId: inviterId,\n  type: 'INVITATION_ACCEPTED' })
  DB --> BE : OK
  BE --> FE : 200 OK
  FE --> I : Redirect vào dự án
else Từ chối lời mời
  FE -> BE : PATCH /invitations/:id/reject
  BE -> DB : Invitation.findByIdAndUpdate(id,\n{ $set: { status: 'rejected' } })
  DB --> BE : OK
  BE --> FE : 200 OK
  FE --> I : Hiển thị "Đã từ chối lời mời"
end

@enduml
```

---

## SD07: Luồng thông báo

```plantuml
@startuml SD07_ThongBao
title Sequence Diagram 07 – Luồng tạo và xem thông báo

skinparam backgroundColor #FAFAFA
skinparam sequenceArrowThickness 2
skinparam ParticipantPadding 20

actor "Người dùng" as U
participant "Angular\nFrontend" as FE
participant "Notification\nBell Component" as BELL
participant "Node.js\nBackend" as BE
database "MongoDB" as DB

autonumber

== Polling thông báo (mỗi 30 giây) ==

loop Mỗi 30 giây (setInterval)
  BELL -> BE : GET /notifications?unreadOnly=true
  BE -> DB : Notification.find\n({ userId, isRead: false })\n.sort({ createdAt: -1 }).limit(10)
  DB --> BE : Danh sách thông báo chưa đọc
  BE --> BELL : 200 OK\n{ notifications[], unreadCount }
  BELL -> BELL : Cập nhật badge số lượng
end

== Người dùng mở dropdown ==

U -> BELL : Nhấn vào chuông thông báo
BELL --> U : Hiển thị dropdown\ndanh sách thông báo gần nhất

== Đọc một thông báo ==

U -> BELL : Nhấn vào một thông báo
BELL -> BE : PATCH /notifications/:id/read
BE -> DB : Notification.findOneAndUpdate\n({ _id: id, userId },\n{ $set: { isRead: true } })
DB --> BE : OK
BE --> BELL : 200 OK
BELL -> BELL : Giảm badge (unreadCount - 1)
BELL -> FE : Điều hướng đến task/trang liên quan
FE --> U : Mở trang liên quan đến thông báo

== Xem tất cả thông báo ==

U -> FE : Nhấn "Xem tất cả thông báo"
FE -> BE : GET /notifications?page=1&limit=20
BE -> DB : Notification.find({ userId })\n.sort({ createdAt: -1 })\n.skip(0).limit(20)
DB --> BE : Danh sách đầy đủ + totalCount
BE --> FE : 200 OK\n{ notifications[], meta }
FE --> U : Hiển thị trang /notifications\nvới bộ lọc Tất cả / Chưa đọc

opt Đánh dấu tất cả đã đọc
  U -> FE : Nhấn "Đánh dấu tất cả đã đọc"
  FE -> BE : PATCH /notifications/read-all
  BE -> DB : Notification.updateMany\n({ userId, isRead: false },\n{ $set: { isRead: true } })
  DB --> BE : { modifiedCount }
  BE --> FE : 200 OK
  FE -> FE : Reset badge về 0
  FE --> U : Tất cả thông báo đã đọc
end

@enduml
```

---

## SD08: AI gợi ý deadline

```plantuml
@startuml SD08_AIDeadline
title Sequence Diagram 08 – AI gợi ý deadline cho task

skinparam backgroundColor #FAFAFA
skinparam sequenceArrowThickness 2
skinparam ParticipantPadding 20

actor "Thành viên" as M
participant "Angular\nFrontend" as FE
participant "Node.js\nBackend" as BE
participant "AI Service\n(Google Gemini\n2.0 Flash)" as AI
database "MongoDB" as DB

autonumber

M -> FE : Mở chi tiết task
M -> FE : Nhấn nút "AI gợi ý deadline"\n(biểu tượng robot)
FE -> FE : Hiển thị popup loading\n"Đang phân tích..."
FE -> BE : POST /tasks/:id/suggest-deadline\n{}
note right of BE : Header: Authorization: Bearer <token>

BE -> BE : Xác thực JWT + kiểm tra quyền canEditTask
BE -> DB : Task.findById(taskId)
DB --> BE : Task document\n(title, description, priority, type, dueDate)

BE -> DB : Task.find\n({ projectId, status: { $ne: 'done' } })
DB --> BE : Danh sách task đang mở trong dự án

opt Có assigneeId
  BE -> DB : Task.countDocuments\n({ assigneeId, status: { $ne: 'done' } })
  DB --> BE : Số task đang thực hiện của assignee
end

BE -> AI : POST https://generativelanguage.googleapis.com/...\n{\n  "prompt": "Phân tích task: [title, desc,\n  priority, type], ngày hiện tại: [today],\n  task khác trong dự án: [...],\n  workload assignee: [N tasks].\n  Gợi ý deadline hợp lý."\n}
note right of AI : Model: gemini-2.0-flash\nResponse format: JSON

AI --> BE : {\n  suggestedDeadline: "2025-xx-xx",\n  estimatedDays: N,\n  confidence: "high|medium|low",\n  reasoning: "...",\n  warnings: [...],\n  alternatives: [...]\n}

BE -> BE : Parse & validate JSON từ AI
BE --> FE : 200 OK\n{ SuggestionResult }
FE -> FE : Ẩn loading

FE --> M : Hiển thị popup kết quả:\n- Ngày gợi ý chính\n- Mức tin cậy (cao/trung/thấp)\n- Lý do phân tích\n- Cảnh báo (nếu có)\n- Các ngày thay thế

alt Chấp nhận gợi ý
  M -> FE : Nhấn "Áp dụng [ngày]"
  FE -> BE : PUT /tasks/:id\n{ dueDate: suggestedDeadline }
  BE -> DB : Task.findByIdAndUpdate(id,\n{ $set: { dueDate } },\n{ new: true })
  DB --> BE : Task document đã cập nhật
  BE --> FE : 200 OK\n{ task đã cập nhật }
  FE -> FE : Cập nhật ProjectStore
  FE -> FE : Đóng popup AI
  FE --> M : Toast "Đã áp dụng [ngày]"\nvà deadline cập nhật trên UI
else Từ chối / chọn thủ công
  M -> FE : Nhấn "Đóng"\nhoặc chọn ngày khác từ date picker
  FE -> FE : Đóng popup
end

@enduml
```

---

## SD09: Xóa task

```plantuml
@startuml SD09_XoaTask
title Sequence Diagram 09 – Xóa task khỏi dự án

skinparam backgroundColor #FAFAFA
skinparam sequenceArrowThickness 2
skinparam ParticipantPadding 20

actor "Admin / Owner" as A
participant "Angular\nFrontend" as FE
participant "Node.js\nBackend" as BE
database "MongoDB" as DB

autonumber

A -> FE : Mở chi tiết task
FE -> FE : Kiểm tra quyền hiển thị nút xóa\n(PermissionService: Admin/Owner only)

alt Không có quyền xóa
  FE --> A : Không hiển thị nút xóa
else Có quyền xóa
  FE --> A : Hiển thị nút "Xóa task" (biểu tượng thùng rác)
  A -> FE : Nhấn nút "Xóa task"
  FE --> A : Hiển thị modal xác nhận\n"Bạn có chắc muốn xóa task này?\nHành động này không thể hoàn tác."

  alt Hủy xóa
    A -> FE : Nhấn "Hủy"
    FE -> FE : Đóng modal
    FE --> A : Trở về trang chi tiết task
  else Xác nhận xóa
    A -> FE : Nhấn "Xóa"
    FE -> BE : DELETE /tasks/:id
    note right of BE : Header: Authorization: Bearer <token>

    BE -> BE : Xác thực JWT
    BE -> DB : Task.findById(taskId)
    DB --> BE : Task document

    BE -> DB : ProjectMember.findOne\n({ userId, projectId: task.projectId })
    DB --> BE : Role của user trong dự án

    alt Không phải Admin/Owner hoặc task không tồn tại
      BE --> FE : 403 Forbidden / 404 Not Found
      FE --> A : Hiển thị thông báo lỗi
    else Có quyền xóa
      BE -> DB : Comment.deleteMany({ taskId })
      BE -> DB : Activity.deleteMany({ taskId })
      BE -> DB : Notification.deleteMany\n({ entityId: taskId, entityType: 'task' })
      BE -> DB : Task.findByIdAndDelete(taskId)
      BE -> DB : Task.updateMany\n({ listId, listPosition: { $gt: deletedPos } },\n{ $inc: { listPosition: -1 } })
      DB --> BE : OK (cascade hoàn tất)
      BE --> FE : 200 OK
      FE -> FE : Xóa task khỏi ProjectStore (Akita)
      FE -> FE : Đóng modal chi tiết task
      FE -> FE : Cập nhật lại Board UI
      FE --> A : Task biến mất khỏi Board
    end
  end
end

@enduml
```

---

## SD10: Cronjob thông báo deadline tự động

```plantuml
@startuml SD10_Cronjob
title Sequence Diagram 10 – Cronjob thông báo deadline tự động

skinparam backgroundColor #FAFAFA
skinparam sequenceArrowThickness 2
skinparam ParticipantPadding 20

participant "Node.js\nCron Scheduler\n(node-cron mỗi 1 giờ)" as CRON
participant "Node.js\nBackend" as BE
database "MongoDB" as DB
actor "Người dùng\n(assignee)" as U
participant "Angular\nFrontend" as FE

autonumber

== Cron job chạy mỗi 1 giờ ==

CRON -> BE : Kích hoạt job\nDeadlineNotificationJob

note over BE : Xử lý due_soon (sắp đến hạn)

BE -> DB : Task.find({\n  dueDate: { $gte: now, $lte: now + 24h },\n  status: { $ne: 'done' },\n  notifiedDueSoon: false,\n  assigneeId: { $exists: true }\n})
DB --> BE : Danh sách task sắp đến hạn

loop Mỗi task sắp đến hạn
  BE -> DB : Notification.create\n({ userId: task.assigneeId,\n  type: 'TASK_DUE_SOON',\n  title: 'Task "[title]" sắp đến hạn',\n  body: 'Deadline: [dueDate]' })
  BE -> DB : Task.findByIdAndUpdate(id,\n{ $set: { notifiedDueSoon: true } })
end

note over BE : Xử lý overdue (quá hạn)

BE -> DB : Task.find({\n  dueDate: { $lt: now },\n  status: { $ne: 'done' },\n  notifiedOverdue: false,\n  assigneeId: { $exists: true }\n})
DB --> BE : Danh sách task đã quá hạn

loop Mỗi task quá hạn
  BE -> DB : Notification.create\n({ userId: task.assigneeId,\n  type: 'TASK_OVERDUE',\n  title: 'Task "[title]" đã quá hạn!',\n  body: 'Deadline: [dueDate]' })
  BE -> DB : Task.findByIdAndUpdate(id,\n{ $set: { notifiedOverdue: true } })
end

note over BE : Xử lý hết hạn lời mời

BE -> DB : Invitation.updateMany\n({ status: 'pending',\n  expiredAt: { $lt: now } },\n{ $set: { status: 'expired' } })
DB --> BE : { modifiedCount }

CRON --> BE : Job hoàn tất\n(logged)

== Người dùng nhận thông báo ==

note over U,FE : Polling tiếp theo (30 giây sau)

FE -> BE : GET /notifications?unreadOnly=true
BE -> DB : Notification.find\n({ userId, isRead: false })\n.sort({ createdAt: -1 }).limit(10)
DB --> BE : Bao gồm thông báo deadline mới
BE --> FE : { notifications[], unreadCount }
FE --> U : Badge chuông tăng\nHiển thị thông báo deadline

@enduml
```

---

## Cách render sơ đồ

### Render tất cả sang PNG

```powershell
# Tải PlantUML JAR: https://plantuml.com/download
java -jar plantuml.jar -charset UTF-8 SEQUENCE_DIAGRAMS.md
# Output: các file .png cùng thư mục
```

### Render online
Paste từng block `@startuml ... @enduml` vào: https://www.plantuml.com/plantuml/
