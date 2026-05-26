# SƠ ĐỒ USE CASE — HỆ THỐNG QUẢN LÝ DỰ ÁN

> **Render PlantUML:** Copy từng block vào [https://www.plantuml.com/plantuml/uml/](https://www.plantuml.com/plantuml/uml/)  
> Hoặc lưu từng block thành file `.puml` rồi chạy `generate.ps1` ở cuối file.

---

## MỤC LỤC

| # | Sơ đồ | Phạm vi | Số UC |
|---|-------|---------|-------|
| 0 | [Tổng quan hệ thống](#sơ-đồ-0-tổng-quan-hệ-thống) | 12 UC trụ cột | 12 |
| 1 | [Xác thực & Tài khoản](#sơ-đồ-1-xác-thực--tài-khoản) | UC-01 → UC-07 | 7 |
| 2 | [Quản lý Dự án & Thành viên](#sơ-đồ-2-quản-lý-dự-án--thành-viên) | UC-08 → UC-28 | 21 |
| 3 | [Board, Cột & Task](#sơ-đồ-3-board-cột--task) | UC-29 → UC-48 | 20 |
| 4 | [Bình luận, Activity & Thông báo](#sơ-đồ-4-bình-luận-activity--thông-báo) | UC-49 → UC-60, UC-66, UC-67 | 14 |
| 5 | [Tính năng AI](#sơ-đồ-5-tính-năng-ai) | UC-61 → UC-65 | 5 |
| | **Tổng** | | **67** |

---

## Sơ đồ 0: Tổng quan hệ thống

**Mục đích:** Bức tranh toàn cảnh hệ thống với 12 use case trụ cột — phù hợp trình bày trước hội đồng.

**Actors:** Guest · User · Member · Admin · Owner · System

**Quan hệ kế thừa actor:** `Guest <|-- User <|-- Member <|-- Admin <|-- Owner`

**Quan hệ include/extend nổi bật:**
- `UC-42` *(Tạo task)* `<<extend>>` `UC-61` *(AI gợi ý deadline)*
- `UC-45` *(Kéo thả task)* `<<include>>` `UC-60` *(Nhận thông báo realtime)*
- `UC-50` *(Thêm bình luận)* `<<include>>` `UC-60`
- `UC-67` *(Cronjob deadline)* `<<include>>` `UC-60`

```plantuml
@startuml uc00_overview
title Sơ đồ Use Case Tổng Quan\nHệ thống Quản lý Dự án

left to right direction

skinparam DefaultFontName Arial
skinparam DefaultFontSize 11
skinparam BackgroundColor White
skinparam ArrowColor #2C3E50

skinparam actor {
  BackgroundColor #FEF9E7
  BorderColor #E67E22
  FontStyle Bold
  FontSize 11
}
skinparam usecase {
  BackgroundColor #EBF5FB
  BorderColor #2980B9
  FontSize 10
}
skinparam rectangle {
  BorderColor #2C3E50
  FontStyle Bold
  BorderThickness 2
  FontSize 13
}

' ===== ACTORS =====
actor "Khách\n(Guest)" as Guest
actor "Người dùng\n(User)" as User
actor "Thành viên\n(Member)" as Member
actor "Quản trị viên\n(Admin)" as Admin
actor "Chủ sở hữu\n(Owner)" as Owner
actor "Hệ thống\n(System)" as System

' Quan hệ kế thừa Actor (Generalization)
Guest <|-- User
User <|-- Member
Member <|-- Admin
Admin <|-- Owner

' ===== SYSTEM BOUNDARY =====
rectangle "Hệ thống Quản lý Dự án" {
  usecase "UC-01\nĐăng ký tài khoản" as UC01
  usecase "UC-02\nĐăng nhập" as UC02
  usecase "UC-09\nTạo dự án" as UC09
  usecase "UC-17\nThêm thành viên" as UC17
  usecase "UC-19\nCấp quyền chi tiết" as UC19
  usecase "UC-42\nTạo task" as UC42
  usecase "UC-45\nKéo thả task\n(Drag & Drop)" as UC45
  usecase "UC-50\nThêm bình luận" as UC50
  usecase "UC-60\nNhận thông báo\nrealtime" as UC60
  usecase "UC-61\nAI gợi ý deadline" as UC61
  usecase "UC-65\nTạo báo cáo AI" as UC65
  usecase "UC-67\nCronjob thông báo\ndeadline tự động" as UC67
}

' ===== ACTOR -> USE CASE =====
Guest --> UC01
Guest --> UC02
User --> UC09
Admin --> UC17
Owner --> UC19
Member --> UC42
Member --> UC45
Member --> UC50
Member --> UC60
Member --> UC61 : canEditTask
Member --> UC65
System --> UC67

' ===== INCLUDE / EXTEND =====
UC42 .> UC61 : <<extend>>
UC45 .> UC60 : <<include>>
UC50 .> UC60 : <<include>>
UC67 .> UC60 : <<include>>

@enduml
```

---

## Sơ đồ 1: Xác thực & Tài khoản

**Phạm vi:** UC-01 → UC-07 | **Actors:** Guest, User

```plantuml
@startuml uc01_auth
title Sơ đồ Use Case 1 — Xác thực & Tài khoản

left to right direction

skinparam DefaultFontName Arial
skinparam DefaultFontSize 11
skinparam BackgroundColor White
skinparam ArrowColor #2C3E50

skinparam actor {
  BackgroundColor #FEF9E7
  BorderColor #E67E22
  FontStyle Bold
}
skinparam usecase {
  BackgroundColor #EBF5FB
  BorderColor #2980B9
}
skinparam usecase<<System>> {
  BackgroundColor #F2F3F4
  BorderColor #95A5A6
  FontColor #555555
}
skinparam rectangle {
  BorderColor #2C3E50
  FontStyle Bold
  BorderThickness 2
}

actor "Khách\n(Guest)" as Guest
actor "Người dùng\n(User)" as User

Guest <|-- User

rectangle "Xác thực & Tài khoản" {
  usecase "UC-01\nĐăng ký tài khoản" as UC01
  usecase "UC-02\nĐăng nhập" as UC02
  usecase "UC-03\nĐăng xuất" as UC03
  usecase "UC-04\nLàm mới Access Token\n(Refresh)" as UC04
  usecase "UC-05\nXem thông tin cá nhân" as UC05
  usecase "UC-06\nCập nhật hồ sơ\n(tên, avatar)" as UC06
  usecase "UC-07\nĐổi mật khẩu" as UC07

  usecase "Xác minh thông tin\nđăng nhập" as SYS_Verify <<System>>
  usecase "Xác minh mật khẩu\nhiện tại" as SYS_OldPwd <<System>>
}

Guest --> UC01
Guest --> UC02
User --> UC03
User --> UC04
User --> UC05
User --> UC06
User --> UC07

UC02 .> SYS_Verify : <<include>>
UC07 .> SYS_OldPwd : <<include>>
UC04 .> UC02 : <<extend>>

note right of UC04
  Được gọi tự động khi
  Access Token (15 phút)
  hết hạn. Dùng Refresh
  Token (7 ngày).
end note

@enduml
```

---

## Sơ đồ 2: Quản lý Dự án & Thành viên

**Phạm vi:** UC-08 → UC-28 | **Actors:** Guest, User, Member, Admin, Owner

```plantuml
@startuml uc02_project_member
title Sơ đồ Use Case 2 — Quản lý Dự án & Thành viên

left to right direction

skinparam DefaultFontName Arial
skinparam DefaultFontSize 10
skinparam BackgroundColor White
skinparam ArrowColor #2C3E50

skinparam actor {
  BackgroundColor #FEF9E7
  BorderColor #E67E22
  FontStyle Bold
}
skinparam usecase {
  BackgroundColor #EBF5FB
  BorderColor #2980B9
}
skinparam usecase<<System>> {
  BackgroundColor #F2F3F4
  BorderColor #95A5A6
  FontColor #555555
}
skinparam rectangle {
  BorderColor #2C3E50
  FontStyle Bold
  BorderThickness 2
}

actor "Khách\n(Guest)" as Guest
actor "Người dùng\n(User)" as User
actor "Thành viên\n(Member)" as Member
actor "Quản trị viên\n(Admin)" as Admin
actor "Chủ sở hữu\n(Owner)" as Owner

Guest <|-- User
User <|-- Member
Member <|-- Admin
Admin <|-- Owner

rectangle "Quản lý Dự án" {
  usecase "UC-08\nXem danh sách dự án" as UC08
  usecase "UC-09\nTạo dự án mới" as UC09
  usecase "UC-10\nTìm kiếm dự án" as UC10
  usecase "UC-11\nDự án truy cập gần đây" as UC11
  usecase "UC-12\nXem chi tiết dự án" as UC12
  usecase "UC-13\nCập nhật thông tin dự án\n(tên, mô tả, background)" as UC13
  usecase "UC-14\nXoá dự án" as UC14
  usecase "UC-15\nCập nhật last-accessed" as UC15
  usecase "UC-22\nChuyển đổi dự án\n(Project Switcher)" as UC22
}

rectangle "Quản lý Thành viên" {
  usecase "UC-16\nXem danh sách thành viên" as UC16
  usecase "UC-17\nThêm thành viên\ntrực tiếp qua email" as UC17
  usecase "UC-18\nThay đổi vai trò\nthành viên" as UC18
  usecase "UC-19\nCập nhật quyền chi tiết\n(canEditTask, canDragTask\ncanAssignSelf, canAssignOthers)" as UC19
  usecase "UC-20\nXem quyền bản thân\ntrong dự án" as UC20
  usecase "UC-21\nXoá thành viên\nkhỏi dự án" as UC21

  usecase "Tìm người dùng\nqua email" as SYS_FindUser <<System>>
}

rectangle "Lời mời (Invitation)" {
  usecase "UC-23\nGửi lời mời\nqua email" as UC23
  usecase "UC-24\nXem danh sách lời mời" as UC24
  usecase "UC-25\nHuỷ lời mời" as UC25
  usecase "UC-26\nXem thông tin lời mời\n(public, qua token)" as UC26
  usecase "UC-27\nChấp nhận lời mời" as UC27
  usecase "UC-28\nTừ chối lời mời" as UC28

  usecase "Gửi email\nthông báo mời" as SYS_Email <<System>>
  usecase "Kiểm tra token\nhợp lệ & hết hạn" as SYS_Token <<System>>
  usecase "Gửi thông báo\ncho người mời" as SYS_NotifyInviter <<System>>
}

' User
User --> UC08
User --> UC09
User --> UC10
User --> UC11
User --> UC22

' Member
Member --> UC12
Member --> UC15
Member --> UC16
Member --> UC20

' Admin
Admin --> UC13
Admin --> UC17
Admin --> UC18
Admin --> UC21
Admin --> UC23
Admin --> UC24
Admin --> UC25

' Owner
Owner --> UC14
Owner --> UC19

' Guest
Guest --> UC26
Guest --> UC28

' User (cần đăng nhập để chấp nhận)
User --> UC27

' Include / Extend
UC17 .> SYS_FindUser : <<include>>
UC23 .> SYS_Email : <<include>>
UC26 .> SYS_Token : <<include>>
UC27 .> SYS_NotifyInviter : <<include>>

@enduml
```

---

## Sơ đồ 3: Board, Cột & Task

**Phạm vi:** UC-29 → UC-48 | **Actors:** Member, Admin, Owner

```plantuml
@startuml uc03_board_task
title Sơ đồ Use Case 3 — Board, Cột & Task

left to right direction

skinparam DefaultFontName Arial
skinparam DefaultFontSize 10
skinparam BackgroundColor White
skinparam ArrowColor #2C3E50

skinparam actor {
  BackgroundColor #FEF9E7
  BorderColor #E67E22
  FontStyle Bold
}
skinparam usecase {
  BackgroundColor #EBF5FB
  BorderColor #2980B9
}
skinparam usecase<<System>> {
  BackgroundColor #F2F3F4
  BorderColor #95A5A6
  FontColor #555555
}
skinparam rectangle {
  BorderColor #2C3E50
  FontStyle Bold
  BorderThickness 2
}

actor "Thành viên\n(Member)" as Member
actor "Quản trị viên\n(Admin)" as Admin
actor "Chủ sở hữu\n(Owner)" as Owner

Member <|-- Admin
Admin <|-- Owner

rectangle "Quản lý Board" {
  usecase "UC-29\nXem danh sách board" as UC29
  usecase "UC-30\nTạo board mới" as UC30
  usecase "UC-31\nXem board với\ncột và task" as UC31
  usecase "UC-32\nĐổi tên board" as UC32
  usecase "UC-33\nXoá board (cascade:\ncột + task)" as UC33
}

rectangle "Quản lý Cột (Column)" {
  usecase "UC-34\nXem danh sách cột" as UC34
  usecase "UC-35\nTạo cột mới" as UC35
  usecase "UC-36\nĐổi tên cột" as UC36
  usecase "UC-37\nSắp xếp lại\nvị trí cột" as UC37
  usecase "UC-38\nXoá cột\n(cascade: task)" as UC38
}

rectangle "Quản lý Task" {
  usecase "UC-39\nXem task của board" as UC39
  usecase "UC-40\nLọc & tìm kiếm task\n(assignee, priority,\nngày, từ khoá)" as UC40
  usecase "UC-41\nXem task theo cột" as UC41
  usecase "UC-42\nTạo task mới" as UC42
  usecase "UC-43\nXem chi tiết task" as UC43
  usecase "UC-44\nChỉnh sửa task\n(tiêu đề, mô tả,\npriority, dueDate)" as UC44
  usecase "UC-45\nKéo thả task\n(Drag & Drop)" as UC45
  usecase "UC-46\nXoá task" as UC46
  usecase "UC-47\nTự gán bản thân\nvào task" as UC47
  usecase "UC-48\nGán người dùng\nkhác vào task" as UC48

  usecase "Ghi ActivityLog" as SYS_Log <<System>>
  usecase "Gửi thông báo\ncho assignee" as SYS_Notif <<System>>
  usecase "AI gợi ý deadline\n(UC-61)" as UC61ref <<System>>
  usecase "Gán assignee\n(tuỳ chọn)" as UC_AssignOpt <<System>>
}

' Member
Member --> UC29
Member --> UC31
Member --> UC34
Member --> UC37
Member --> UC39
Member --> UC40
Member --> UC41
Member --> UC42
Member --> UC43
Member --> UC46
Member --> UC44 : canEditTask
Member --> UC45 : canDragTask
Member --> UC47 : canAssignSelf
Member --> UC48 : canAssignOthers

' Admin
Admin --> UC30
Admin --> UC32
Admin --> UC33
Admin --> UC35
Admin --> UC36
Admin --> UC38

' Include / Extend
UC42 .> SYS_Log : <<include>>
UC42 .> UC_AssignOpt : <<extend>>
UC44 .> SYS_Log : <<include>>
UC44 .> UC61ref : <<extend>>
UC45 .> SYS_Log : <<include>>
UC45 .> SYS_Notif : <<include>>

@enduml
```

---

## Sơ đồ 4: Bình luận, Activity & Thông báo

**Phạm vi:** UC-49 → UC-60, UC-66, UC-67 | **Actors:** User, Member, Admin, Owner, System

```plantuml
@startuml uc04_comment_notification
title Sơ đồ Use Case 4 — Bình luận, Activity & Thông báo

left to right direction

skinparam DefaultFontName Arial
skinparam DefaultFontSize 10
skinparam BackgroundColor White
skinparam ArrowColor #2C3E50

skinparam actor {
  BackgroundColor #FEF9E7
  BorderColor #E67E22
  FontStyle Bold
}
skinparam usecase {
  BackgroundColor #EBF5FB
  BorderColor #2980B9
}
skinparam usecase<<System>> {
  BackgroundColor #F2F3F4
  BorderColor #95A5A6
  FontColor #555555
}
skinparam rectangle {
  BorderColor #2C3E50
  FontStyle Bold
  BorderThickness 2
}

actor "Người dùng\n(User)" as User
actor "Thành viên\n(Member)" as Member
actor "Quản trị viên\n(Admin)" as Admin
actor "Chủ sở hữu\n(Owner)" as Owner
actor "Hệ thống\n(System/Cronjob)" as System

User <|-- Member
Member <|-- Admin
Admin <|-- Owner

rectangle "Bình luận & Activity" {
  usecase "UC-49\nXem danh sách bình luận" as UC49
  usecase "UC-50\nThêm bình luận" as UC50
  usecase "UC-51\nSửa bình luận\n(chỉ người tạo)" as UC51
  usecase "UC-52\nXoá bình luận\n(chỉ người tạo)" as UC52
  usecase "UC-53\nXem lịch sử hoạt động\ncủa task" as UC53
  usecase "UC-54\nXem feed tổng hợp\n(activity + comment)" as UC54

  usecase "Ghi ActivityLog" as SYS_Log <<System>>
}

rectangle "Thông báo (Notification)" {
  usecase "UC-55\nXem danh sách thông báo\n(phân trang, lọc chưa đọc)" as UC55
  usecase "UC-56\nĐếm thông báo chưa đọc" as UC56
  usecase "UC-57\nĐánh dấu thông báo\nđã đọc" as UC57
  usecase "UC-58\nĐánh dấu tất cả\nđã đọc" as UC58
  usecase "UC-59\nXoá thông báo" as UC59
  usecase "UC-60\nNhận thông báo\nrealtime (Socket.IO)" as UC60

  usecase "Kết nối Socket.IO\n(JWT auth)" as SYS_Socket <<System>>
}

rectangle "Tự động hoá (Cronjob — mỗi 1 giờ)" {
  usecase "UC-66\nTự động hết hạn\nlời mời" as UC66
  usecase "UC-67\nThông báo deadline\ntự động\n(due_soon & overdue)" as UC67

  usecase "Cập nhật trạng thái\nlời mời → expired" as SYS_Expire <<System>>
}

' Member (trong dự án)
Member --> UC49
Member --> UC50
Member --> UC53
Member --> UC54

' User (chỉ cần đăng nhập)
User --> UC51
User --> UC52
User --> UC55
User --> UC56
User --> UC57
User --> UC58
User --> UC59
User --> UC60

' System (Cronjob)
System --> UC66
System --> UC67

' Include / Extend
UC50 .> SYS_Log : <<include>>
UC50 .> UC60 : <<include>>
UC60 .> SYS_Socket : <<include>>
UC67 .> UC60 : <<include>>
UC66 .> SYS_Expire : <<include>>

@enduml
```

---

## Sơ đồ 5: Tính năng AI

**Phạm vi:** UC-61 → UC-65 | **Actors:** Member, Admin, Owner, System

```plantuml
@startuml uc05_ai
title Sơ đồ Use Case 5 — Tính năng AI (Google Gemini 2.0 Flash)

left to right direction

skinparam DefaultFontName Arial
skinparam DefaultFontSize 11
skinparam BackgroundColor White
skinparam ArrowColor #2C3E50

skinparam actor {
  BackgroundColor #FEF9E7
  BorderColor #E67E22
  FontStyle Bold
}
skinparam usecase {
  BackgroundColor #EBF5FB
  BorderColor #2980B9
}
skinparam usecase<<System>> {
  BackgroundColor #F2F3F4
  BorderColor #95A5A6
  FontColor #555555
}
skinparam rectangle {
  BorderColor #2C3E50
  FontStyle Bold
  BorderThickness 2
}

actor "Thành viên\n(Member)" as Member
actor "Quản trị viên\n(Admin)" as Admin
actor "Chủ sở hữu\n(Owner)" as Owner
actor "Hệ thống\n(System/AI)" as System

Member <|-- Admin
Admin <|-- Owner

rectangle "Tính năng AI (Google Gemini 2.0 Flash)" {
  usecase "UC-61\nAI gợi ý deadline\ncho task" as UC61
  usecase "UC-62\nTóm tắt tiến độ\ndự án bằng AI" as UC62
  usecase "UC-63\nThống kê & phân tích\ndự án bằng AI" as UC63
  usecase "UC-64\nDự đoán khả năng\nhoàn thành dự án" as UC64
  usecase "UC-65\nTạo báo cáo dự án\nbằng AI (markdown)" as UC65

  usecase "Gọi Gemini API" as SYS_Gemini <<System>>
  usecase "Phân tích lịch sử task\n& workload assignee" as SYS_History <<System>>
  usecase "Tổng hợp thống kê\ndự án" as SYS_Stats <<System>>
}

' Member có canEditTask mới dùng UC-61
Member --> UC61 : canEditTask
Member --> UC62
Member --> UC63
Member --> UC64
Member --> UC65

System --> SYS_Gemini

' Include
UC61 .> SYS_History : <<include>>
UC61 .> SYS_Gemini : <<include>>
UC62 .> SYS_Gemini : <<include>>
UC63 .> SYS_Gemini : <<include>>
UC64 .> SYS_Stats : <<include>>
UC64 .> SYS_Gemini : <<include>>
UC65 .> SYS_Stats : <<include>>
UC65 .> SYS_Gemini : <<include>>

note bottom of UC61
  Trả về: suggestedDeadline,
  estimatedDays, confidence
  (high/medium/low),
  reasoning, alternatives
end note

note bottom of UC64
  Trả về: prediction,
  confidence, critical factors,
  urgent actions
end note

@enduml
```

---

## Hướng dẫn tạo ảnh PNG (Windows)

> **Yêu cầu:** Java 8+ đã cài đặt (`java -version` để kiểm tra).

**Bước 1:** Lưu từng block PlantUML thành file `.puml` riêng (ví dụ: `uc00_overview.puml`, `uc01_auth.puml`, ...)

**Bước 2:** Tạo file `generate.ps1` cùng thư mục với nội dung sau, rồi chạy bằng PowerShell:

```powershell
# generate.ps1 — Chạy trong PowerShell tại thư mục chứa file .puml

$outputDir = ".\output"
$jarPath   = ".\plantuml.jar"
$jarUrl    = "https://github.com/plantuml/plantuml/releases/download/v1.2024.8/plantuml-1.2024.8.jar"

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
    Write-Host "Tao thu muc output/" -ForegroundColor Green
}

if (-not (Test-Path $jarPath)) {
    Write-Host "Dang tai PlantUML jar..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $jarUrl -OutFile $jarPath
    Write-Host "Tai xong!" -ForegroundColor Green
}

$pumlFiles = Get-ChildItem -Path "." -Filter "*.puml"
if ($pumlFiles.Count -eq 0) {
    Write-Host "Khong tim thay file .puml trong thu muc nay." -ForegroundColor Red
    exit 1
}

foreach ($file in $pumlFiles) {
    Write-Host "Dang tao: $($file.Name) ..." -ForegroundColor Cyan
    java -jar $jarPath -charset UTF-8 -tpng -o (Resolve-Path $outputDir) $file.FullName
}

Write-Host "`nHoan thanh! File PNG nam trong: $outputDir" -ForegroundColor Green
```

**Hoặc dùng trực tuyến:** Copy từng block vào [https://www.plantuml.com/plantuml/uml/](https://www.plantuml.com/plantuml/uml/) → tải PNG về.
