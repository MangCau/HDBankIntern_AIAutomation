# Hướng dẫn sử dụng ngrok cho n8n callback

## Bước 1: Start Backend Server

Mở Terminal 1 (PowerShell hoặc CMD):
```bash
cd "c:\Users\Nam Anh\Desktop\HDBank AIAutomation\backend"
npm start
```

Backend sẽ chạy tại: http://localhost:5000

---

## Bước 2: Start ngrok

Mở Terminal 2 và chạy:
```bash
cd "c:\Users\Nam Anh\Desktop\HDBank AIAutomation"
start-ngrok.bat
```

Hoặc:
```bash
.\ngrok\ngrok.exe http 5000
```

Bạn sẽ thấy giao diện như sau:
```
ngrok

Session Status                online
Account                       [your account]
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc-123-xyz.ngrok-free.app -> http://localhost:5000
```

---

## Bước 3: Copy ngrok URL và cập nhật .env

**QUAN TRỌNG:** Copy URL từ dòng `Forwarding`:
- Ví dụ: `https://abc-123-xyz.ngrok-free.app`

Mở file `backend/.env` và cập nhật:
```env
# Uncomment và update với ngrok URL
BACKEND_URL=https://abc-123-xyz.ngrok-free.app
```

Lưu file và **RESTART backend server** (Terminal 1):
- Nhấn `Ctrl+C` để dừng
- Chạy lại: `npm start`

---

## Bước 4: Verify callback URL

Khi backend restart, bạn sẽ thấy log:
```
Callback URL: { callbackUrl: 'https://abc-123-xyz.ngrok-free.app/api/n8n/workflow-callback/...' }
```

Nếu thấy log này → ✅ Setup thành công!

---

## Bước 5: Test workflow

1. Mở frontend tại http://localhost:5173
2. Chọn ngày và nhấn "Tóm tắt"
3. Bạn sẽ thấy:
   - "Đang xử lý..." với Job ID
   - n8n workflow chạy
   - Khi hoàn thành, hiển thị 2 nút: "Xem tóm tắt" và "Chọn lại"

---

## Lưu ý

### ⚠️ ngrok URL thay đổi mỗi lần restart
Mỗi khi bạn dừng và chạy lại ngrok, URL sẽ thay đổi. Bạn cần:
1. Copy URL mới
2. Cập nhật `BACKEND_URL` trong `.env`
3. Restart backend

### 💡 Để có URL cố định (ngrok paid)
Nếu không muốn update mỗi lần, có thể upgrade ngrok account để có subdomain cố định:
```bash
ngrok http 5000 --subdomain=hdbank-auto
# URL sẽ luôn là: https://hdbank-auto.ngrok.io
```

### 🔍 Debug ngrok requests
Mở trình duyệt tại: http://localhost:4040
Bạn sẽ thấy tất cả requests đến ngrok (bao gồm n8n callback).

---

## Troubleshooting

### Lỗi: "ERR_NGROK_108"
➡️ Cần đăng ký tài khoản ngrok (miễn phí):
1. Truy cập: https://dashboard.ngrok.com/signup
2. Đăng ký tài khoản
3. Lấy authtoken từ: https://dashboard.ngrok.com/get-started/your-authtoken
4. Chạy: `.\ngrok\ngrok.exe config add-authtoken YOUR_AUTHTOKEN`

### Lỗi: Backend vẫn dùng localhost
➡️ Kiểm tra:
1. File `.env` đã uncomment `BACKEND_URL`?
2. Đã restart backend server sau khi update `.env`?

### n8n callback không hoạt động
➡️ Kiểm tra:
1. ngrok đang chạy?
2. Backend đang chạy?
3. Truy cập http://localhost:4040 để xem requests
4. Check backend logs xem có nhận callback không

---

## Khi deploy production

Khi deploy lên server thật (Heroku/Railway/VPS):
1. Không cần ngrok nữa
2. Chỉ cần update `BACKEND_URL` với domain thật
3. Ví dụ: `BACKEND_URL=https://hdbank-api.herokuapp.com`
