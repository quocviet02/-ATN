# Sơ đồ Activity Diagram – Hệ thống Quản lý Dự án

> Tất cả sơ đồ sử dụng cú pháp PlantUML (new-style activity diagram với swimlane).
> Render bằng: `java -jar plantuml.jar ACTIVITY_DIAGRAMS.md` hoặc paste vào https://www.plantuml.com/plantuml/

---

## Sơ đồ 1: Đăng nhập hệ thống

```plantuml
@startuml AD01_DangNhap
title Sơ đồ hoạt động 01 – Đăng nhập hệ thống

skinparam swimlaneWidth 220
skinparam backgroundColor #FAFAFA

|Người dùng|
start
:Truy cập trang /login;
:Nhập email và mật khẩu;
:Nhấn nút "Đăng nhập";

|Frontend (Angular)|
:Validate form\n(định dạng email, không rỗng);
if (Form hợp lệ?) then (Có)
  :Gửi POST /auth/login\n{email, password};

  |Backend (NestJS)|
  :Nhận request;
  :Tìm User theo email;
  if (Tồn tại user?) then (Có)
    :So sánh mật khẩu (bcrypt.compare);
    if (Mật khẩu đúng?) then (Có)
      :Tạo JWT (accessToken, expiresIn);
      :Trả về { user, accessToken };

      |Frontend (Angular)|
      :Lưu token vào localStorage;
      :Cập nhật AuthStore (Akita);
      :Điều hướng đến /project;

      |Người dùng|
      :Xem Board dự án;
      stop
    else (Không)
      |Backend (NestJS)|
      :Trả về 401 Unauthorized;
      |Frontend (Angular)|
      :Hiển thị "Đăng nhập thất bại";
    endif
  else (Không)
    |Backend (NestJS)|
    :Trả về 401 Unauthorized;
    |Frontend (Angular)|
    :Hiển thị "Tài khoản không tồn tại";
  endif
else (Không)
  :Hiển thị lỗi validation dưới field;
endif

|Người dùng|
:Sửa thông tin và thử lại;
stop
@enduml
```

---

## Sơ đồ 2: Tạo task (Issue)

```plantuml
@startuml AD02_TaoTask
title Sơ đồ hoạt động 02 – Tạo task mới

skinparam swimlaneWidth 220
skinparam backgroundColor #FAFAFA

|Thành viên|
start
:Nhấn nút "+ Tạo task"\ntrên Navbar hoặc Board;

|Frontend (Angular)|
:Mở modal AddIssueModal;
:Hiển thị form tạo task\n(tiêu đề, loại, ưu tiên, người thực hiện);

|Thành viên|
:Điền thông tin task;
:Nhấn "Tạo";

|Frontend (Angular)|
:Validate: tiêu đề không rỗng;
if (Hợp lệ?) then (Có)
  :Gửi POST /tasks\n{title, type, priority, assigneeId, projectId};

  |Backend (NestJS)|
  :Kiểm tra quyền thành viên dự án;
  if (Có quyền?) then (Có)
    :Xác định listId theo trạng thái đầu (Backlog);
    :Tạo bản ghi Task trong DB\n(gán listPosition tự động);
    :Tạo bản ghi Activity\n"[user] created this task";
    :Tạo Notification cho\nngười được giao việc (nếu có);
    :Trả về task mới tạo;

    |Frontend (Angular)|
    :Cập nhật ProjectStore (Akita)\nvà UI Board ngay lập tức;
    :Đóng modal;

    |Thành viên|
    :Thấy task mới trên cột Backlog;
    stop
  else (Không)
    |Backend (NestJS)|
    :Trả về 403 Forbidden;
    |Frontend (Angular)|
    :Hiển thị thông báo lỗi quyền;
  endif
else (Không)
  :Hiển thị lỗi "Vui lòng nhập tiêu đề";
endif

|Thành viên|
:Sửa và thử lại;
stop
@enduml
```

---

## Sơ đồ 3: Di chuyển task trên Board (thay đổi trạng thái)

```plantuml
@startuml AD03_DiChuyenTask
title Sơ đồ hoạt động 03 – Di chuyển task giữa các cột

skinparam swimlaneWidth 220
skinparam backgroundColor #FAFAFA

|Thành viên|
start
:Kéo task từ cột nguồn\nsang cột đích (Drag & Drop);

|Frontend (Angular)|
:Xử lý sự kiện cdkDrop;
:Tính toán listId đích và\nvị trí mới (listPosition);
:Cập nhật UI ngay lập tức\n(optimistic update);
:Gửi PUT /tasks/:id\n{listId, listPosition};

|Backend (NestJS)|
:Xác thực JWT;
:Kiểm tra task thuộc dự án của user;
if (Hợp lệ?) then (Có)
  :Cập nhật listId và listPosition\ncủa task trong DB;
  :Sắp xếp lại listPosition\ncác task trong cột;
  :Ghi bản ghi Activity\n"[user] moved task from X to Y";
  :Tạo Notification cho\nassignee (nếu khác user hiện tại);
  :Trả về task đã cập nhật;

  |Frontend (Angular)|
  :Xác nhận cập nhật trong ProjectStore;

  |Thành viên|
  :Task hiển thị đúng cột mới;
  stop
else (Không)
  |Backend (NestJS)|
  :Trả về 403/404;
  |Frontend (Angular)|
  :Hoàn tác vị trí task về cũ;
  :Hiển thị thông báo lỗi;
  |Thành viên|
  :Task quay lại cột cũ;
  stop
endif
@enduml
```

---

## Sơ đồ 4: Bình luận trên task

```plantuml
@startuml AD04_BinhLuan
title Sơ đồ hoạt động 04 – Thêm bình luận vào task

skinparam swimlaneWidth 220
skinparam backgroundColor #FAFAFA

|Thành viên|
start
:Mở chi tiết task;
:Nhập nội dung bình luận\nvào ô comment (Quill editor);
:Nhấn "Lưu" / Enter;

|Frontend (Angular)|
:Kiểm tra nội dung không rỗng;
if (Có nội dung?) then (Có)
  :Gửi POST /tasks/:id/comments\n{body: "<html>..."};

  |Backend (NestJS)|
  :Xác thực JWT và quyền thành viên;
  if (Hợp lệ?) then (Có)
    :Lưu Comment vào DB\n(taskId, userId, body, createdAt);
    :Ghi Activity\n"[user] commented: ...";
    :Lấy danh sách watchers của task\n(assignee + reporter + prev commenters);
    :Tạo Notification cho mỗi watcher\n(trừ người bình luận);
    :Trả về comment mới;

    |Frontend (Angular)|
    :Thêm comment vào danh sách\ntrên UI;
    :Reset ô nhập;

    |Thành viên|
    :Thấy bình luận của mình;
    stop
  else (Không)
    |Backend (NestJS)|
    :Trả về 403 Forbidden;
    |Frontend (Angular)|
    :Hiển thị thông báo lỗi;
  endif
else (Không)
  :Không làm gì (bỏ qua);
endif
stop
@enduml
```

---

## Sơ đồ 5: Mời thành viên vào dự án

```plantuml
@startuml AD05_MoiThanhVien
title Sơ đồ hoạt động 05 – Mời thành viên vào dự án

skinparam swimlaneWidth 220
skinparam backgroundColor #FAFAFA

|Admin / Owner|
start
:Vào trang Members;
:Nhập email người cần mời;
:Chọn vai trò (member / admin);
:Nhấn "Gửi lời mời";

|Frontend (Angular)|
:Validate định dạng email;
if (Email hợp lệ?) then (Có)
  :Gửi POST /projects/:id/invitations\n{email, role};

  |Backend (NestJS)|
  :Kiểm tra quyền Admin/Owner;
  if (Có quyền?) then (Có)
    :Tìm user theo email;
    if (User tồn tại?) then (Có)
      :Kiểm tra đã là thành viên chưa;
      if (Chưa là thành viên?) then (Có)
        :Tạo Invitation record\n(status: pending, expiredAt: +7 ngày);
        :Gửi Notification cho user được mời;
        :Trả về invitation mới;

        |Frontend (Angular)|
        :Cập nhật danh sách lời mời\npending trên UI;

        |Admin / Owner|
        :Thấy lời mời đang chờ xác nhận;

        |Người được mời|
        :Nhận thông báo lời mời;
        :Nhấn "Chấp nhận" hoặc "Từ chối";

        |Backend (NestJS)|
        if (Chấp nhận?) then (Có)
          :Cập nhật Invitation status = accepted;
          :Tạo ProjectMember record\n(userId, projectId, role);
          :Trả về thông tin thành viên mới;
          |Người được mời|
          :Truy cập được dự án;
          stop
        else (Từ chối)
          :Cập nhật Invitation status = rejected;
          stop
        endif
      else (Đã là thành viên)
        |Backend (NestJS)|
        :Trả về 409 Conflict;
        |Frontend (Angular)|
        :Thông báo "Email đã là thành viên";
      endif
    else (Không tồn tại)
      |Backend (NestJS)|
      :Trả về 404 Not Found;
      |Frontend (Angular)|
      :Thông báo "Tài khoản không tồn tại";
    endif
  else (Không có quyền)
    |Backend (NestJS)|
    :Trả về 403 Forbidden;
    |Frontend (Angular)|
    :Thông báo lỗi quyền;
  endif
else (Không hợp lệ)
  :Hiển thị lỗi định dạng email;
endif
stop
@enduml
```

---

## Sơ đồ 6: Luồng thông báo (Notification)

```plantuml
@startuml AD06_ThongBao
title Sơ đồ hoạt động 06 – Luồng tạo và xem thông báo

skinparam swimlaneWidth 220
skinparam backgroundColor #FAFAFA

|Hệ thống (Backend)|
start
:Sự kiện kích hoạt thông báo\n(task giao việc / bình luận /\nthay đổi trạng thái / lời mời);
:Xác định danh sách người nhận;
:Tạo bản ghi Notification\n(userId, type, title, body,\nentityId, isRead=false);
:Lưu vào DB;

|Frontend (Angular) – Notification Bell|
:Polling mỗi 30 giây\nGET /notifications?unreadOnly=true;
:Nhận danh sách thông báo chưa đọc;
:Cập nhật số badge trên chuông;

|Người dùng|
:Nhấn vào chuông thông báo;

|Frontend (Angular) – Notification Bell|
:Hiển thị dropdown\ndanh sách thông báo gần nhất;

|Người dùng|
:Nhấn vào một thông báo;

|Frontend (Angular)|
:Gửi PATCH /notifications/:id/read;

|Backend (NestJS)|
:Cập nhật isRead = true;
:Trả về thành công;

|Frontend (Angular)|
:Giảm số badge;
:Điều hướng đến task / trang liên quan;

|Người dùng|
:Xem nội dung liên quan\nđến thông báo;

if (Muốn xem tất cả?) then (Có)
  |Người dùng|
  :Nhấn "Xem tất cả thông báo";
  |Frontend (Angular)|
  :Điều hướng tới trang /notifications;
  :Tải danh sách đầy đủ\nGET /notifications (có phân trang);
  |Người dùng|
  :Lọc theo trạng thái\n(Tất cả / Chưa đọc);
  stop
else (Không)
  stop
endif
@enduml
```

---

## Sơ đồ 7: AI gợi ý deadline

```plantuml
@startuml AD07_AIDeadline
title Sơ đồ hoạt động 07 – AI gợi ý deadline cho task

skinparam swimlaneWidth 220
skinparam backgroundColor #FAFAFA

|Thành viên|
start
:Mở chi tiết task;
:Nhấn nút "AI gợi ý deadline"\n(biểu tượng robot);

|Frontend (Angular)|
:Hiển thị popup loading\n"Đang phân tích...";
:Gửi POST /tasks/:id/suggest-deadline\n{} (body rỗng);

|Backend (NestJS)|
:Lấy thông tin task\n(tiêu đề, mô tả, ưu tiên, loại);
:Lấy danh sách task hiện có\ncủa dự án (task đang mở);
:Lấy thông tin assignee\n(số task đang thực hiện);

|AI Service (Gemini / OpenAI)|
:Nhận prompt bao gồm:\n- Thông tin task cần gợi ý\n- Ngữ cảnh task khác\n- Ngày hiện tại;
:Phân tích độ phức tạp,\nưu tiên và workload;
:Tạo phản hồi JSON:\n{suggestedDeadline, estimatedDays,\nconfidence, reasoning,\nwarnings, alternatives};

|Backend (NestJS)|
:Nhận phản hồi AI;
:Parse và validate JSON;
:Trả về SuggestionResult;

|Frontend (Angular)|
:Ẩn loading;
:Hiển thị popup kết quả:\n- Ngày gợi ý chính\n- Mức độ tin cậy (cao/trung/thấp)\n- Lý do phân tích\n- Cảnh báo (nếu có)\n- Các ngày thay thế;

|Thành viên|
if (Chấp nhận gợi ý?) then (Có)
  :Nhấn "Áp dụng [ngày]";
  |Frontend (Angular)|
  :Gọi updateIssue với dueDate mới;
  :Đóng popup;
  :Hiển thị toast "Đã áp dụng [ngày]";
  |Thành viên|
  :Thấy deadline đã cập nhật;
  stop
else (Không)
  |Thành viên|
  :Nhấn "Đóng" hoặc chọn ngày thủ công;
  stop
endif
@enduml
```

---

## Sơ đồ 8: Xóa task

```plantuml
@startuml AD08_XoaTask
title Sơ đồ hoạt động 08 – Xóa task khỏi dự án

skinparam swimlaneWidth 220
skinparam backgroundColor #FAFAFA

|Thành viên|
start
:Mở chi tiết task;
:Nhấn nút "Xóa task" (biểu tượng thùng rác);

|Frontend (Angular)|
:Kiểm tra quyền hiển thị nút xóa\n(chỉ Admin/Owner thấy);
if (Có quyền xóa?) then (Có)
  :Hiển thị modal xác nhận\n"Bạn có chắc muốn xóa task này?";

  |Thành viên|
  if (Xác nhận xóa?) then (Có)
    |Frontend (Angular)|
    :Gửi DELETE /tasks/:id;

    |Backend (NestJS)|
    :Xác thực JWT;
    :Kiểm tra role của user\ntrong dự án;
    if (Admin hoặc Owner?) then (Có)
      :Lấy thông tin task\n(assigneeId, taskId);
      :Xóa tất cả Comments của task;
      :Xóa tất cả Activities của task;
      :Xóa tất cả Notifications\nliên quan đến task;
      :Xóa bản ghi Task;
      :Sắp xếp lại listPosition\ncủa các task còn lại trong cột;
      :Trả về 200 OK;

      |Frontend (Angular)|
      :Xóa task khỏi ProjectStore;
      :Đóng modal chi tiết task;
      :Cập nhật giao diện Board;

      |Thành viên|
      :Task biến mất khỏi Board;
      stop
    else (Không đủ quyền)
      |Backend (NestJS)|
      :Trả về 403 Forbidden;
      |Frontend (Angular)|
      :Hiển thị thông báo "Không có quyền xóa";
    endif
  else (Hủy)
    :Đóng modal xác nhận;
    stop
  endif
else (Không có quyền)
  :Không hiển thị nút xóa\n(xử lý bằng PermissionService);
  stop
endif
stop
@enduml
```

---

## Cách render sơ đồ

### Render tất cả sang PNG

```powershell
# Tải PlantUML JAR: https://plantuml.com/download
java -jar plantuml.jar -charset UTF-8 ACTIVITY_DIAGRAMS.md
# Output: các file .png cùng thư mục
```

### Render online
Paste từng block `@startuml ... @enduml` vào: https://www.plantuml.com/plantuml/
