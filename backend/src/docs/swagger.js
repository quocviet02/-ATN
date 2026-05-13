/** @type {import('swagger-ui-express').SwaggerUiOptions} */
const spec = {
  openapi: '3.0.0',
  info: {
    title: 'Task Manager API',
    version: '1.0.0',
    description:
      'REST API cho ứng dụng quản lý dự án và công việc.\n\n' +
      '**Xác thực:** Nhấn nút **Authorize** ở góc phải trên, nhập `accessToken` nhận được sau khi đăng nhập.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Development' }],

  tags: [
    { name: 'Auth',     description: 'Đăng ký · Đăng nhập · Token' },
    { name: 'Projects', description: 'CRUD dự án · Tìm kiếm' },
    { name: 'Members',  description: 'Quản lý thành viên & phân quyền' },
    { name: 'Tasks',       description: 'CRUD công việc · Di chuyển (drag & drop)' },
    { name: 'Comments',    description: 'Bình luận trên task' },
    { name: 'Activities',  description: 'Lịch sử hoạt động của task' },
    { name: 'AI',          description: 'Phân tích · Thống kê · Dự đoán · Báo cáo bằng Claude AI' },
  ],

  // ─── Reusable components ────────────────────────────────────────────────────
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập accessToken (không cần tiền tố "Bearer ")',
      },
    },

    schemas: {
      // ── Primitives ──────────────────────────────────────────────────────────
      UUID: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },

      Error: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer',  example: 400 },
          message:    { type: 'string',   example: 'Validation error' },
          error:      { type: 'string',   example: 'Bad Request' },
        },
      },

      // ── Auth ────────────────────────────────────────────────────────────────
      User: {
        type: 'object',
        properties: {
          id:        { $ref: '#/components/schemas/UUID' },
          name:      { type: 'string',  example: 'Nguyen Van A' },
          email:     { type: 'string',  format: 'email', example: 'user@example.com' },
          avatar:    { type: 'string',  nullable: true, example: null },
          createdAt: { type: 'string',  format: 'date-time' },
          updatedAt: { type: 'string',  format: 'date-time' },
          deletedAt: { type: 'string',  format: 'date-time', nullable: true, example: null },
        },
      },

      TokenPair: {
        type: 'object',
        properties: {
          accessToken:  { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },

      AuthResponse: {
        allOf: [
          { $ref: '#/components/schemas/TokenPair' },
          { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } },
        ],
      },

      // ── Projects ────────────────────────────────────────────────────────────
      Project: {
        type: 'object',
        properties: {
          id:          { $ref: '#/components/schemas/UUID' },
          name:        { type: 'string', example: 'My Project' },
          description: { type: 'string', example: 'Project description' },
          ownerId:     { $ref: '#/components/schemas/UUID' },
          owner:       { $ref: '#/components/schemas/User' },
          createdAt:   { type: 'string', format: 'date-time' },
          updatedAt:   { type: 'string', format: 'date-time' },
          deletedAt:   { type: 'string', format: 'date-time', nullable: true, example: null },
        },
      },

      ProjectWithRole: {
        allOf: [
          { $ref: '#/components/schemas/Project' },
          {
            type: 'object',
            properties: {
              myRole: { type: 'string', enum: ['owner', 'admin', 'member'], example: 'owner' },
            },
          },
        ],
      },

      // ── Members ─────────────────────────────────────────────────────────────
      ProjectMember: {
        type: 'object',
        properties: {
          id:        { $ref: '#/components/schemas/UUID' },
          projectId: { $ref: '#/components/schemas/UUID' },
          userId:    { $ref: '#/components/schemas/UUID' },
          role:      { type: 'string', enum: ['owner', 'admin', 'member'], example: 'member' },
          user:      { $ref: '#/components/schemas/User' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ── Comments ─────────────────────────────────────────────────────────────
      Comment: {
        type: 'object',
        properties: {
          id:        { $ref: '#/components/schemas/UUID' },
          taskId:    { $ref: '#/components/schemas/UUID' },
          userId:    { $ref: '#/components/schemas/UUID' },
          content:   { type: 'string', example: 'This needs more testing before release.' },
          user:      { $ref: '#/components/schemas/User' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          deletedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
        },
      },

      // ── ActivityLog ───────────────────────────────────────────────────────────
      ActivityLog: {
        type: 'object',
        properties: {
          id:        { $ref: '#/components/schemas/UUID' },
          taskId:    { $ref: '#/components/schemas/UUID' },
          userId:    { $ref: '#/components/schemas/UUID' },
          action:    { type: 'string', enum: ['created', 'updated', 'moved', 'assigned', 'commented', 'deleted'] },
          oldValue:  { type: 'object', nullable: true, description: 'Trạng thái trước thay đổi', example: { priority: 'medium' } },
          newValue:  { type: 'object', nullable: true, description: 'Trạng thái sau thay đổi',  example: { priority: 'high' } },
          user:      { $ref: '#/components/schemas/User' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ── AI ───────────────────────────────────────────────────────────────────
      AIStats: {
        type: 'object',
        properties: {
          total:          { type: 'integer', example: 24 },
          doneTasks:      { type: 'integer', example: 10 },
          completionRate: { type: 'number',  example: 41.7 },
          overdue:        { type: 'integer', example: 3 },
          byColumn:       { type: 'object', additionalProperties: { type: 'integer' }, example: { 'To Do': 8, 'In Progress': 6, 'Done': 10 } },
          byPriority:     { type: 'object', properties: { low: { type: 'integer' }, medium: { type: 'integer' }, high: { type: 'integer' }, critical: { type: 'integer' } } },
          byAssignee:     { type: 'object', additionalProperties: { type: 'integer' }, example: { 'Nguyen Van A': 5, 'Chưa gán': 3 } },
          generatedAt:    { type: 'string', format: 'date-time' },
        },
      },

      // ── Tasks ────────────────────────────────────────────────────────────────
      Task: {
        type: 'object',
        properties: {
          id:          { $ref: '#/components/schemas/UUID' },
          columnId:    { $ref: '#/components/schemas/UUID' },
          boardId:     { $ref: '#/components/schemas/UUID' },
          title:       { type: 'string', example: 'Fix login bug' },
          description: { type: 'string', example: 'Users cannot login with Google...' },
          assigneeId:  { $ref: '#/components/schemas/UUID', nullable: true },
          assignee:    { $ref: '#/components/schemas/User', nullable: true },
          priority:    { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'high' },
          dueDate:     { type: 'string', format: 'date', nullable: true, example: '2025-12-31' },
          position:    { type: 'integer', example: 0 },
          createdAt:   { type: 'string', format: 'date-time' },
          updatedAt:   { type: 'string', format: 'date-time' },
          deletedAt:   { type: 'string', format: 'date-time', nullable: true, example: null },
        },
      },
    },

    // ── Shared responses ──────────────────────────────────────────────────────
    responses: {
      Unauthorized: {
        description: '401 — Token không hợp lệ hoặc đã hết hạn',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: '403 — Không có quyền thực hiện thao tác này',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: '404 — Không tìm thấy tài nguyên',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      BadRequest: {
        description: '400 — Dữ liệu đầu vào không hợp lệ',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },

    // ── Shared parameters ─────────────────────────────────────────────────────
    parameters: {
      projectId: { in: 'path', name: 'id',       required: true, schema: { type: 'string', format: 'uuid' }, description: 'Project ID' },
      boardId:   { in: 'path', name: 'boardId',   required: true, schema: { type: 'string', format: 'uuid' }, description: 'Board ID' },
      columnId:  { in: 'path', name: 'columnId',  required: true, schema: { type: 'string', format: 'uuid' }, description: 'Column ID' },
      taskId:    { in: 'path', name: 'id',        required: true, schema: { type: 'string', format: 'uuid' }, description: 'Task ID' },
      userId:    { in: 'path', name: 'userId',    required: true, schema: { type: 'string', format: 'uuid' }, description: 'User ID' },
    },
  },

  // ─── Paths ──────────────────────────────────────────────────────────────────
  paths: {

    // ════════════════ AUTH ════════════════════════════════════════════════════

    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng ký tài khoản',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name:     { type: 'string', example: 'Nguyen Van A' },
                  email:    { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', minLength: 6, example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Đăng ký thành công → trả về user + tokens', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          409: { description: '409 — Email đã tồn tại', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng nhập',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Đăng nhập thành công → user + tokens', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng xuất — xóa refreshToken khỏi DB',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Đã đăng xuất', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string', example: 'Logged out successfully' } } } } } },
        },
      },
    },

    '/api/auth/refresh-token': {
      post: {
        tags: ['Auth'],
        summary: 'Lấy accessToken mới (refresh token rotation)',
        description: 'Xóa refreshToken cũ, trả về cặp token mới.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cặp token mới', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenPair' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Lấy thông tin user hiện tại',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Thông tin user', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/auth/profile': {
      put: {
        tags: ['Auth'],
        summary: 'Cập nhật name / avatar',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:   { type: 'string', example: 'Nguyen Van B' },
                  avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Đã cập nhật', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/auth/change-password': {
      put: {
        tags: ['Auth'],
        summary: 'Đổi mật khẩu — revoke toàn bộ refresh sessions',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['oldPassword', 'newPassword'],
                properties: {
                  oldPassword: { type: 'string', example: '123456' },
                  newPassword: { type: 'string', minLength: 6, example: 'newPass123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Đổi mật khẩu thành công' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ════════════════ PROJECTS ════════════════════════════════════════════════

    '/api/projects': {
      get: {
        tags: ['Projects'],
        summary: 'Danh sách project tôi tham gia (kèm myRole)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { projects: { type: 'array', items: { $ref: '#/components/schemas/ProjectWithRole' } } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Tạo project — người tạo tự động trở thành owner',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name:        { type: 'string', example: 'My Awesome Project' },
                  description: { type: 'string', example: 'Project description' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Project đã tạo', content: { 'application/json': { schema: { type: 'object', properties: { project: { $ref: '#/components/schemas/Project' } } } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/projects/search': {
      get: {
        tags: ['Projects'],
        summary: 'Tìm kiếm project theo tên (chỉ trong project tôi tham gia)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'q', schema: { type: 'string' }, description: 'Từ khóa (case-insensitive, PostgreSQL iLike)' },
        ],
        responses: {
          200: { description: 'Kết quả tìm kiếm', content: { 'application/json': { schema: { type: 'object', properties: { projects: { type: 'array', items: { $ref: '#/components/schemas/ProjectWithRole' } } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Chi tiết project + danh sách members',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/projectId' }],
        responses: {
          200: {
            description: 'Chi tiết project',
            content: { 'application/json': { schema: { type: 'object', properties: { project: { $ref: '#/components/schemas/Project' }, myRole: { type: 'string', enum: ['owner', 'admin', 'member'] } } } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Projects'],
        summary: 'Cập nhật project (owner hoặc admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/projectId' }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:        { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Đã cập nhật', content: { 'application/json': { schema: { type: 'object', properties: { project: { $ref: '#/components/schemas/Project' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Xóa project (chỉ owner — soft delete)',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/projectId' }],
        responses: {
          200: { description: 'Đã xóa project' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ════════════════ MEMBERS ═════════════════════════════════════════════════

    '/api/projects/{id}/members': {
      get: {
        tags: ['Members'],
        summary: 'Danh sách thành viên (tất cả members đều xem được)',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/projectId' }],
        responses: {
          200: { description: 'Danh sách members', content: { 'application/json': { schema: { type: 'object', properties: { members: { type: 'array', items: { $ref: '#/components/schemas/ProjectMember' } } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Members'],
        summary: 'Thêm thành viên bằng email (owner hoặc admin)',
        description:
          '- **owner**: thêm được cả `admin` và `member`\n' +
          '- **admin**: chỉ thêm được `member`',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/projectId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'newmember@example.com' },
                  role:  { type: 'string', enum: ['admin', 'member'], default: 'member' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Đã thêm thành viên', content: { 'application/json': { schema: { type: 'object', properties: { member: { $ref: '#/components/schemas/ProjectMember' } } } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { description: '404 — Email không tồn tại trong hệ thống', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: '409 — User đã là thành viên', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/api/projects/{id}/members/{userId}': {
      put: {
        tags: ['Members'],
        summary: 'Đổi role thành viên (chỉ owner)',
        description: 'Không thể đổi role của owner. Dùng tính năng transfer ownership nếu cần.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/projectId' },
          { $ref: '#/components/parameters/userId' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: { role: { type: 'string', enum: ['admin', 'member'] } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Role đã cập nhật', content: { 'application/json': { schema: { type: 'object', properties: { member: { $ref: '#/components/schemas/ProjectMember' } } } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Members'],
        summary: 'Xóa thành viên',
        description:
          '- **owner**: xóa admin hoặc member\n' +
          '- **admin**: chỉ xóa member (không xóa được admin khác)\n' +
          '- Không thể xóa owner',
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/projectId' },
          { $ref: '#/components/parameters/userId' },
        ],
        responses: {
          200: { description: 'Đã xóa thành viên' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ════════════════ TASKS — Board level ═════════════════════════════════════

    '/api/boards/{boardId}/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Tất cả tasks trong board — grouped theo columnId',
        description: 'Response là object: `{ tasks: { [columnId]: Task[] } }`',
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/boardId' },
          { in: 'query', name: 'assigneeId', schema: { type: 'string', format: 'uuid' }, description: 'Lọc theo người được giao' },
          { in: 'query', name: 'priority',   schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }, description: 'Lọc theo độ ưu tiên' },
          { in: 'query', name: 'search',     schema: { type: 'string' }, description: 'Tìm theo tiêu đề (iLike)' },
          { in: 'query', name: 'dueDateFrom', schema: { type: 'string', format: 'date' }, description: 'Hạn ≥ ngày này (YYYY-MM-DD)' },
          { in: 'query', name: 'dueDateTo',   schema: { type: 'string', format: 'date' }, description: 'Hạn ≤ ngày này (YYYY-MM-DD)' },
        ],
        responses: {
          200: {
            description: 'Tasks grouped theo columnId',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tasks: {
                      type: 'object',
                      description: 'Key = columnId (UUID)',
                      additionalProperties: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
                      example: { 'col-uuid-1': [], 'col-uuid-2': [] },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ════════════════ TASKS — Column level ════════════════════════════════════

    '/api/columns/{columnId}/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Tasks trong một cột — sort theo position ASC',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/columnId' }],
        responses: {
          200: { description: 'Danh sách task', content: { 'application/json': { schema: { type: 'object', properties: { tasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Tạo task mới — position tự động = cuối cột',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/columnId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title:       { type: 'string', example: 'Implement login feature' },
                  description: { type: 'string', example: 'Detailed description...' },
                  assigneeId:  { type: 'string', format: 'uuid', nullable: true },
                  priority:    { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
                  dueDate:     { type: 'string', format: 'date', nullable: true, example: '2025-12-31' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Task đã tạo', content: { 'application/json': { schema: { type: 'object', properties: { task: { $ref: '#/components/schemas/Task' } } } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    // ════════════════ TASKS — Flat ════════════════════════════════════════════

    '/api/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Chi tiết task',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/taskId' }],
        responses: {
          200: { description: 'Task', content: { 'application/json': { schema: { type: 'object', properties: { task: { $ref: '#/components/schemas/Task' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Tasks'],
        summary: 'Cập nhật metadata task',
        description: 'Chỉ cập nhật title, description, assignee, priority, dueDate. Để thay đổi position/column dùng endpoint `/move`.',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/taskId' }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title:       { type: 'string' },
                  description: { type: 'string' },
                  assigneeId:  { type: 'string', format: 'uuid', nullable: true },
                  priority:    { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  dueDate:     { type: 'string', format: 'date', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Task đã cập nhật', content: { 'application/json': { schema: { type: 'object', properties: { task: { $ref: '#/components/schemas/Task' } } } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Xóa task (soft delete — đóng gap position)',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/taskId' }],
        responses: {
          200: { description: 'Task đã xóa' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/tasks/{id}/move': {
      put: {
        tags: ['Tasks'],
        summary: 'Di chuyển task — drag & drop với reorder position',
        description:
          '**Cùng cột:**\n' +
          '- `new > old` → shift `[old+1 .. new]` lên −1\n' +
          '- `new < old` → shift `[new .. old-1]` xuống +1\n\n' +
          '**Khác cột:**\n' +
          '1. Đóng gap ở cột nguồn: `(old, ∞)` − 1\n' +
          '2. Mở khoảng ở cột đích: `[new, ∞)` + 1\n' +
          '3. Cập nhật `columnId` + `position`\n\n' +
          '_Toàn bộ thực hiện trong một Sequelize transaction._',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/taskId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['targetColumnId', 'newPosition'],
                properties: {
                  targetColumnId: { type: 'string', format: 'uuid', description: 'Column đích (có thể là cột hiện tại nếu di chuyển trong cùng cột)' },
                  newPosition:    { type: 'integer', minimum: 0, description: 'Vị trí mới (0-indexed)' },
                },
                example: { targetColumnId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', newPosition: 2 },
              },
            },
          },
        },
        responses: {
          200: { description: 'Task đã di chuyển', content: { 'application/json': { schema: { type: 'object', properties: { task: { $ref: '#/components/schemas/Task' } } } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ════════════════ COMMENTS ════════════════════════════════════════════════

    '/api/tasks/{taskId}/comments': {
      get: {
        tags: ['Comments'],
        summary: 'Danh sách comment của task (mới nhất trước)',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'taskId', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Task ID' }],
        responses: {
          200: { description: 'Danh sách comment', content: { 'application/json': { schema: { type: 'object', properties: { comments: { type: 'array', items: { $ref: '#/components/schemas/Comment' } } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Comments'],
        summary: 'Thêm comment — tự động tạo ActivityLog',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'taskId', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Task ID' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: { content: { type: 'string', example: 'Cần review lại phần auth middleware.' } },
              },
            },
          },
        },
        responses: {
          201: { description: 'Comment đã tạo', content: { 'application/json': { schema: { type: 'object', properties: { comment: { $ref: '#/components/schemas/Comment' } } } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/comments/{id}': {
      put: {
        tags: ['Comments'],
        summary: 'Sửa comment (chỉ tác giả)',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Comment ID' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: { content: { type: 'string', example: 'Nội dung mới.' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Comment đã cập nhật', content: { 'application/json': { schema: { type: 'object', properties: { comment: { $ref: '#/components/schemas/Comment' } } } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Comments'],
        summary: 'Xóa comment (chỉ tác giả — soft delete)',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Comment ID' }],
        responses: {
          200: { description: 'Comment đã xóa' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ════════════════ ACTIVITIES ══════════════════════════════════════════════

    '/api/tasks/{taskId}/activities': {
      get: {
        tags: ['Activities'],
        summary: 'Lịch sử hoạt động của task (mới nhất trước)',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'taskId', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Task ID' }],
        responses: {
          200: { description: 'Danh sách activity log', content: { 'application/json': { schema: { type: 'object', properties: { activities: { type: 'array', items: { $ref: '#/components/schemas/ActivityLog' } } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ════════════════ AI ══════════════════════════════════════════════════════

    '/api/projects/{id}/ai/summary': {
      get: {
        tags: ['AI'],
        summary: 'Phân tích tiến độ dự án bằng Claude AI',
        description:
          'Gọi **Claude API** để tạo bản phân tích tiến độ tóm gọn (< 1 500 token).\n\n' +
          'Trả về: tóm tắt, điểm mạnh, rủi ro, đề xuất hành động + thống kê tính toán.\n\n' +
          '_Thời gian phản hồi thường 3 – 8 giây. Timeout 90s._',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/projectId' }],
        responses: {
          200: {
            description: 'Phân tích thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    summary:     { type: 'string', description: 'Văn bản Markdown phân tích từ Claude' },
                    stats:       { $ref: '#/components/schemas/AIStats' },
                    model:       { type: 'string', example: 'claude-sonnet-4-20250514' },
                    usage:       { type: 'object', description: 'Token usage từ Anthropic API', properties: { input_tokens: { type: 'integer' }, output_tokens: { type: 'integer' } } },
                    generatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          408: { description: '408 — Claude API timeout (>90s)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          503: { description: '503 — Claude API quá tải, thử lại sau', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/api/projects/{id}/ai/statistics': {
      get: {
        tags: ['AI'],
        summary: 'Thống kê dự án (tính toán thuần — không gọi AI)',
        description: 'Trả về ngay thống kê: byColumn, byPriority, byAssignee, overdue, completionRate. Không có độ trễ từ AI.',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/projectId' }],
        responses: {
          200: {
            description: 'Thống kê',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AIStats' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/projects/{id}/ai/predict': {
      post: {
        tags: ['AI'],
        summary: 'Dự đoán khả năng hoàn thành đúng hạn bằng Claude AI',
        description:
          'Gọi **Claude API** để dự đoán: Sẽ hoàn thành đúng hạn / Có nguy cơ trễ / Chắc chắn trễ.\n\n' +
          'Nếu không truyền `deadline`, AI vẫn phân tích dựa trên dueDate của từng task.\n\n' +
          '_Timeout 90s._',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/projectId' }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  deadline: { type: 'string', format: 'date', nullable: true, example: '2025-12-31', description: 'ISO date — deadline tổng của dự án (tuỳ chọn)' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Dự đoán thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    prediction:  { type: 'string', description: 'Văn bản dự đoán Markdown từ Claude' },
                    deadline:    { type: 'string', format: 'date', nullable: true },
                    stats:       { $ref: '#/components/schemas/AIStats' },
                    model:       { type: 'string', example: 'claude-sonnet-4-20250514' },
                    usage:       { type: 'object', properties: { input_tokens: { type: 'integer' }, output_tokens: { type: 'integer' } } },
                    generatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          408: { description: '408 — Claude API timeout', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          503: { description: '503 — Claude API quá tải', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/api/projects/{id}/ai/report': {
      post: {
        tags: ['AI'],
        summary: 'Tạo báo cáo Markdown toàn diện bằng Claude AI (streaming)',
        description:
          'Gọi **Claude API** với streaming để tạo báo cáo chi tiết:\n\n' +
          '1. Tổng quan dự án\n' +
          '2. Tiến độ theo board / cột\n' +
          '3. Phân tích rủi ro & task quá hạn\n' +
          '4. Thống kê theo độ ưu tiên & người phụ trách\n' +
          '5. Đề xuất hành động cụ thể\n\n' +
          '_Output tối đa 4 096 token. Timeout 90s._',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/projectId' }],
        responses: {
          200: {
            description: 'Báo cáo thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    report:      { type: 'string', description: 'Báo cáo đầy đủ dưới định dạng Markdown' },
                    stats:       { $ref: '#/components/schemas/AIStats' },
                    model:       { type: 'string', example: 'claude-sonnet-4-20250514' },
                    usage:       { type: 'object', properties: { input_tokens: { type: 'integer' }, output_tokens: { type: 'integer' } } },
                    generatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          408: { description: '408 — Claude API timeout', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          503: { description: '503 — Claude API quá tải', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
};

module.exports = spec;
