# Bảng Kịch Bản Sử Dụng Use Case

---

**Bảng 2.1. Kịch bản sử dụng tổng quan hệ thống**

| Tên chức năng | Tổng quan hệ thống |
|---|---|
| Tác nhân | Người dùng chưa đăng nhập, Thành viên (Member), Quản trị viên (Admin), Chủ sở hữu (Owner), Hệ thống (System) |
| Điều kiện đầu vào | Người dùng truy cập ứng dụng qua trình duyệt web |
| Hậu điều kiện - Thành công | Người dùng được xác thực và truy cập đầy đủ các chức năng tương ứng với vai trò trong hệ thống |
| Hậu điều kiện - Khác | Người dùng không được xác thực bị chuyển hướng về trang đăng nhập; người dùng không đủ quyền nhận thông báo từ chối |
| Các luồng sự kiện | Các luồng sự kiện chính:<br>- Bước 1: Người dùng truy cập ứng dụng, hệ thống kiểm tra trạng thái xác thực<br>- Bước 2: Nếu chưa đăng nhập, hệ thống chuyển hướng về trang đăng nhập; nếu đã đăng nhập, chuyển sang Bước 3<br>- Bước 3: Hệ thống tải dữ liệu dự án, board và thành viên tương ứng với tài khoản<br>- Bước 4: Người dùng thực hiện các thao tác trong phạm vi quyền hạn (quản lý task, bình luận, xem thông báo...)<br>- Bước 5: Hệ thống xử lý yêu cầu, cập nhật dữ liệu và đồng bộ realtime đến các thành viên liên quan<br>- Nếu phiên đăng nhập hết hạn, hệ thống tự động làm mới token; nếu không thể làm mới, chuyển sang luồng phụ — yêu cầu đăng nhập lại |

---

**Bảng 2.2. Kịch bản sử dụng xác thực và tài khoản**

| Tên chức năng | Xác thực và tài khoản |
|---|---|
| Tác nhân | Người dùng chưa có tài khoản, Người dùng đã có tài khoản |
| Điều kiện đầu vào | Người dùng truy cập trang đăng ký hoặc đăng nhập; có kết nối mạng đến máy chủ |
| Hậu điều kiện - Thành công | Người dùng được cấp accessToken và refreshToken, truy cập được hệ thống với đầy đủ quyền hạn tương ứng |
| Hậu điều kiện - Khác | Thông tin không hợp lệ: hệ thống hiển thị thông báo lỗi cụ thể, giữ nguyên form để người dùng chỉnh sửa |
| Các luồng sự kiện | Các luồng sự kiện chính:<br>- Bước 1: Người dùng nhập thông tin xác thực (email, mật khẩu) và xác nhận<br>- Bước 2: Hệ thống frontend kiểm tra định dạng dữ liệu đầu vào; nếu không hợp lệ chuyển sang luồng phụ A<br>- Bước 3: Hệ thống backend xác minh thông tin với cơ sở dữ liệu; nếu không khớp chuyển sang luồng phụ B<br>- Bước 4: Hệ thống tạo cặp JWT (accessToken hiệu lực 15 phút, refreshToken hiệu lực 7 ngày) và trả về client<br>- Bước 5: Frontend lưu token, cập nhật trạng thái xác thực và điều hướng người dùng vào trang chính<br>- Luồng phụ A — Dữ liệu không hợp lệ: hiển thị lỗi validation ngay dưới trường nhập, không gửi yêu cầu lên server<br>- Luồng phụ B — Xác thực thất bại: hiển thị thông báo lỗi, người dùng nhập lại thông tin |

---

**Bảng 2.3. Kịch bản sử dụng quản lý dự án và thành viên**

| Tên chức năng | Quản lý dự án và thành viên |
|---|---|
| Tác nhân | Chủ sở hữu (Owner), Quản trị viên (Admin), Thành viên (Member) |
| Điều kiện đầu vào | Người dùng đã đăng nhập vào hệ thống; Owner hoặc Admin thực hiện các thao tác quản lý |
| Hậu điều kiện - Thành công | Dự án và danh sách thành viên được cập nhật đúng theo yêu cầu; các thay đổi có hiệu lực ngay lập tức với tất cả người dùng liên quan |
| Hậu điều kiện - Khác | Thao tác không đủ quyền bị từ chối với mã lỗi 403; dữ liệu không hợp lệ hiển thị thông báo lỗi; lời mời quá hạn tự động chuyển trạng thái hết hạn |
| Các luồng sự kiện | Các luồng sự kiện chính:<br>- Bước 1: Owner tạo dự án mới, hệ thống tự động khởi tạo board Kanban mặc định với 4 cột và gán vai trò Owner cho người tạo<br>- Bước 2: Owner hoặc Admin mời thành viên qua email; hệ thống gửi đường dẫn xác nhận có thời hạn đến địa chỉ email được chỉ định<br>- Bước 3: Người được mời nhấn đường dẫn trong email để chấp nhận hoặc từ chối lời mời; nếu chấp nhận, hệ thống thêm vào dự án với vai trò Member<br>- Bước 4: Owner hoặc Admin điều chỉnh vai trò và quyền chi tiết của từng thành viên (canEditTask, canDragTask, canAssignSelf, canAssignOthers)<br>- Bước 5: Các thành viên truy cập và làm việc trong dự án theo phạm vi quyền được cấp<br>- Nếu cần xóa thành viên, chuyển sang luồng phụ A — xác nhận và xóa, quyền truy cập bị thu hồi ngay lập tức |

---

**Bảng 2.4. Kịch bản sử dụng board, cột và task**

| Tên chức năng | Quản lý board, cột và task |
|---|---|
| Tác nhân | Chủ sở hữu (Owner), Quản trị viên (Admin), Thành viên (Member) |
| Điều kiện đầu vào | Người dùng đã đăng nhập và là thành viên của dự án; dự án đã có board Kanban |
| Hậu điều kiện - Thành công | Board hiển thị đúng trạng thái mới nhất; các thay đổi về task và cột được đồng bộ realtime đến toàn bộ thành viên đang xem board |
| Hậu điều kiện - Khác | Thao tác không đủ quyền bị từ chối; task bị xóa biến mất khỏi board của tất cả thành viên kèm thông báo realtime; thao tác kéo thả không hợp lệ được hoàn tác |
| Các luồng sự kiện | Các luồng sự kiện chính:<br>- Bước 1: Thành viên truy cập board, hệ thống tải toàn bộ cột và task tương ứng và hiển thị theo dạng Kanban<br>- Bước 2: Owner hoặc Admin tạo task mới, nhập tiêu đề, mô tả, chọn người được giao, mức độ ưu tiên và deadline; hệ thống ghi nhật ký hoạt động<br>- Bước 3: Thành viên có quyền chỉnh sửa cập nhật thông tin task; hệ thống ghi nhật ký thay đổi và gửi thông báo đến người liên quan<br>- Bước 4: Thành viên có quyền kéo thả task sang cột khác hoặc đổi vị trí trong cột; hệ thống tự động cập nhật lại thứ tự<br>- Bước 5: Khi cần xóa task, người dùng xác nhận bằng cách nhập từ khóa "XÓA"; hệ thống xóa mềm task và toàn bộ bình luận, đồng bộ cập nhật board của tất cả thành viên<br>- Nếu người dùng không đủ quyền, chuyển sang luồng phụ A — hiển thị thông báo từ chối, giữ nguyên trạng thái board |

---

**Bảng 2.5. Kịch bản sử dụng bình luận và thông báo**

| Tên chức năng | Bình luận và thông báo |
|---|---|
| Tác nhân | Thành viên (Member), Quản trị viên (Admin), Chủ sở hữu (Owner), Hệ thống (System) |
| Điều kiện đầu vào | Người dùng đã đăng nhập và là thành viên của dự án; task tồn tại trong hệ thống |
| Hậu điều kiện - Thành công | Bình luận được lưu và hiển thị trong feed của task; thông báo được gửi đến các thành viên liên quan ngay lập tức qua Socket.IO |
| Hậu điều kiện - Khác | Bình luận rỗng không được gửi; thông báo không đến được do mất kết nối sẽ được tải lại khi kết nối phục hồi |
| Các luồng sự kiện | Các luồng sự kiện chính:<br>- Bước 1: Thành viên mở chi tiết task và nhập nội dung bình luận vào ô soạn thảo<br>- Bước 2: Hệ thống lưu bình luận, ghi nhật ký hoạt động và hiển thị ngay trong feed của task<br>- Bước 3: Hệ thống tự động gửi thông báo realtime qua Socket.IO đến các thành viên liên quan (người tạo task, người được giao task)<br>- Bước 4: Người nhận thông báo thấy số đếm chưa đọc tăng lên trên biểu tượng chuông; nhấn vào để xem danh sách thông báo<br>- Bước 5: Người dùng đánh dấu thông báo đã đọc hoặc đánh dấu tất cả đã đọc; hệ thống cập nhật trạng thái tức thì<br>- Ngoài ra, hệ thống tự động gửi thông báo theo lịch mỗi giờ khi task sắp đến hạn (còn dưới 24 giờ) hoặc đã quá hạn đến người được giao |

---

**Bảng 2.6. Kịch bản sử dụng tính năng AI**

| Tên chức năng | Tính năng trí tuệ nhân tạo (Google Gemini 2.0 Flash) |
|---|---|
| Tác nhân | Thành viên có quyền chỉnh sửa task (canEditTask), Quản trị viên (Admin), Chủ sở hữu (Owner), Hệ thống AI (Google Gemini) |
| Điều kiện đầu vào | Người dùng đã đăng nhập, có quyền chỉnh sửa task; task phải có tiêu đề; hệ thống có kết nối đến Google Gemini API |
| Hậu điều kiện - Thành công | Kết quả phân tích từ AI được hiển thị trực quan; người dùng áp dụng hoặc bỏ qua gợi ý theo ý muốn; nếu áp dụng, thay đổi được lưu và ghi vào nhật ký hoạt động |
| Hậu điều kiện - Khác | API không phản hồi: hiển thị thông báo lỗi, giữ nguyên dữ liệu task; người dùng bỏ qua gợi ý: task không thay đổi |
| Các luồng sự kiện | Các luồng sự kiện chính:<br>- Bước 1: Người dùng mở chi tiết task và kích hoạt tính năng AI (gợi ý deadline, tóm tắt tiến độ, phân tích dự án hoặc tạo báo cáo)<br>- Bước 2: Hệ thống thu thập dữ liệu ngữ cảnh liên quan (tiêu đề, mô tả task, lịch sử hoạt động, workload của assignee, thống kê dự án)<br>- Bước 3: Hệ thống gửi dữ liệu đã xử lý đến Google Gemini API và chờ phản hồi; hiển thị trạng thái đang phân tích<br>- Bước 4: Hệ thống nhận kết quả từ AI và hiển thị gợi ý chính kèm các lựa chọn thay thế, mức độ tin cậy và lý do đề xuất<br>- Bước 5: Người dùng xem xét kết quả và chọn áp dụng một gợi ý hoặc đóng mà không thay đổi<br>- Nếu Gemini API không phản hồi hoặc trả về lỗi, chuyển sang luồng phụ A — hiển thị thông báo lỗi kết nối, đề nghị thử lại sau |
