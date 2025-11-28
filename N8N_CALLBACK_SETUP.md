# Hướng dẫn cấu hình n8n Workflow với Callback

## Tổng quan

Để tránh lỗi timeout 524, hệ thống sử dụng pattern **callback** thay vì đợi đồng bộ:

1. Frontend gọi backend để bắt đầu workflow
2. Backend trả về `jobId` ngay lập tức (200 OK)
3. Backend gọi n8n webhook và truyền `jobId` + `callbackUrl`
4. n8n xử lý workflow (có thể mất 10-20 phút)
5. Khi xong, n8n gọi callback về backend để cập nhật trạng thái
6. Frontend polling mỗi 5 giây, phát hiện job hoàn thành và hiển thị nút "Xem thông tin"

## Cấu hình n8n Workflow

### Bước 1: Nhận dữ liệu từ Webhook Trigger

n8n workflow của bạn sẽ nhận được:

```json
{
  "startDate": "2025-10-31",
  "endDate": "2025-11-27",
  "jobId": "5bdc14fc9e16eddf863e8ce325d2a075",
  "callbackUrl": "http://localhost:5000/api/n8n/workflow-callback/5bdc14fc9e16eddf863e8ce325d2a075"
}
```

### Bước 2: Thêm HTTP Request node ở cuối workflow

Ở cuối workflow (sau khi tất cả processing xong), thêm **HTTP Request node** với cấu hình:

#### Authentication
- **None**

#### Request Method
- **POST**

#### URL
```
{{ $('Webhook').item.json.callbackUrl }}
```
Hoặc nếu không work:
```
{{ $json.callbackUrl }}
```

#### Body Parameters
- **KHÔNG CẦN GỬI BODY**
- Chỉ cần gọi POST request đến URL callback là đủ
- Backend sẽ tự động đánh dấu job là "completed" khi nhận được callback

**Nếu muốn gửi thêm data (tùy chọn):**
```json
{
  "message": "Workflow completed successfully"
}
```

Backend sẽ chấp nhận bất kỳ body nào hoặc body rỗng.

### Bước 3: Xử lý lỗi (Tùy chọn)

**Nếu workflow chạy thành công**, n8n sẽ gọi callback và backend tự động đánh dấu job là "completed".

**Nếu workflow bị lỗi**, có 2 lựa chọn:
1. **Không làm gì** - Job sẽ mãi ở trạng thái "processing" (không khuyến khích)
2. **Thêm Error Trigger** - Gọi callback ngay cả khi lỗi (để user biết đã fail)

Nếu chọn option 2, bạn không cần gửi body gì đặc biệt. Backend hiện tại sẽ luôn đánh dấu là "completed" khi nhận callback. Nếu muốn phân biệt success/failure, bạn có thể gửi:

```json
{
  "status": "failed",
  "error": "{{ $json.error.message }}"
}
```

Nhưng hiện tại backend chưa xử lý field này (sẽ cần update code nếu muốn).

### Sơ đồ workflow

```
[Webhook Trigger]
    ↓ (nhận startDate, endDate, jobId, callbackUrl)
[Processing Step 1]
    ↓
[Processing Step 2]
    ↓
[Processing Step 3]
    ↓
[HTTP Request - Callback]
    → Method: POST
    → URL: {{ $('Webhook').item.json.callbackUrl }}
    → Body: Để trống hoặc gửi gì cũng được
```

**ĐƠN GIẢN HƠN:**
Chỉ cần thêm 1 HTTP Request node ở cuối, POST đến `callbackUrl`. Không cần body, không cần error handling.

## Test local với ngrok (nếu n8n không truy cập được localhost)

Nếu n8n cloud không gọi được `http://localhost:5000`, bạn cần expose backend qua ngrok:

```bash
# Cài ngrok
npm install -g ngrok

# Expose backend port 5000
ngrok http 5000
```

Sau đó cập nhật biến môi trường:

```bash
# backend/.env
BACKEND_URL=https://your-ngrok-url.ngrok.io
```

## Kiểm tra log

### Backend logs
```bash
cd backend
npm run dev
```

Xem log khi workflow bắt đầu:
```
info: Created job: {"jobId":"...","startDate":"...","endDate":"..."}
info: Callback URL: {"callbackUrl":"http://localhost:5000/api/n8n/workflow-callback/..."}
info: Starting workflow execution: {"jobId":"...","startDate":"...","endDate":"..."}
```

Xem log khi n8n callback:
```
info: Workflow completed via callback: {"jobId":"..."}
```

### Frontend console logs
Mở DevTools Console, sẽ thấy:
```
Starting workflow... {startDateISO: '2025-10-31', endDateISO: '2025-11-27'}
Workflow started: {jobId: '...', status: 'processing'}
Job status: {id: '...', status: 'processing', ...} (mỗi 5 giây)
Job status: {id: '...', status: 'completed', ...} (khi xong)
```

## Xử lý Production

Khi deploy production, đảm bảo:

1. **Backend URL được cấu hình đúng**
   ```bash
   # .env.production
   BACKEND_URL=https://your-production-backend.com
   ```

2. **n8n có thể truy cập backend**
   - Backend phải có public URL
   - Không có firewall chặn
   - CORS đã được cấu hình

3. **Callback endpoint accept POST**
   - Endpoint: `POST /api/n8n/workflow-callback/:jobId`
   - Body: `{ success: boolean, result?: any, error?: string }`

## Troubleshooting

### Lỗi: n8n không gọi callback
- Kiểm tra n8n logs xem HTTP Request node có lỗi không
- Test callback URL bằng Postman:
  ```bash
  POST http://localhost:5000/api/n8n/workflow-callback/test-job-id
  Content-Type: application/json

  {
    "success": true,
    "result": {"test": "data"}
  }
  ```

### Lỗi: Job mãi không chuyển sang "completed"
- Kiểm tra backend logs xem có nhận callback không
- Kiểm tra n8n workflow có chạy đến HTTP Request node cuối cùng không
- Kiểm tra callbackUrl có đúng format không

### Lỗi: "Job not found" khi callback
- JobId đã bị xóa khỏi memory (backend restart)
- Solution: Dùng database thay vì in-memory Map

## Nâng cấp (Production)

Thay `Map` bằng **MongoDB** để lưu job status:

```javascript
// backend/src/models/Job.js
const jobSchema = new mongoose.Schema({
  jobId: String,
  status: String,
  startDate: String,
  endDate: String,
  result: Object,
  error: String,
  createdAt: Date,
  completedAt: Date
});
```

Điều này đảm bảo job status không bị mất khi restart server.
