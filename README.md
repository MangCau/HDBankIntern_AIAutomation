# HDBank AI Automation

> Hệ thống tự động hóa thu thập, xử lý và tạo báo cáo tin tức ngành ngân hàng & fintech sử dụng AI

## 📋 Tổng quan

HDBank AI Automation là một ứng dụng full-stack được thiết kế để:
- 🔍 Thu thập tin tức từ nhiều nguồn (Web, Facebook, PDF)
- 🤖 Xử lý nội dung tự động với AI (Google Gemini)
- 📊 Tạo báo cáo tổng hợp 4 trang chuyên nghiệp
- 🖼️ Sinh ảnh minh họa tự động từ nội dung
- ☁️ Lưu trữ dữ liệu trên cloud (MongoDB Atlas, Google Cloud Storage)
- 🔄 Tích hợp N8N workflow automation

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  HomePage │ SelectNews │ SummaryPages │ ViewReport │ History   │
└────────────────────────┬───────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼───────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Data Routes │  │Report Routes │  │ N8N Routes         │   │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬──────────┘   │
│         │                │                     │               │
│  ┌──────▼────────────────▼─────────────────────▼──────────┐   │
│  │           Services & Utilities Layer                    │   │
│  │  • Crawler Service (Playwright, Apify)                  │   │
│  │  • GCS Service (Image Storage)                          │   │
│  │  • Gemini AI Service (Image Generation)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬───────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
┌─────────▼──────┐  ┌───▼────────┐  ┌─▼──────────────┐
│  MongoDB Atlas │  │ Google GCS │  │ Google Gemini  │
│  (Database)    │  │ (Storage)  │  │ (AI Service)   │
└────────────────┘  └────────────┘  └────────────────┘
```

## 🛠️ Công nghệ sử dụng

### Backend
- **Runtime**: Node.js v20+
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB + Mongoose 8.0.3
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **AI/ML**:
  - Google Generative AI (@google/generative-ai 0.24.1)
  - Gemini 2.5 Flash Image model
- **Web Scraping**:
  - Playwright 1.57.0
  - Apify API (Facebook scraper)
- **Cloud Storage**: Google Cloud Storage 7.18.0
- **Validation**: Joi 17.11.0
- **Logging**: Winston 3.11.0

### Frontend
- **Framework**: React 18.2.0 + TypeScript 5.3.3
- **Build Tool**: Vite 5.0.8
- **Routing**: React Router DOM 6.20.1
- **State Management**: Zustand 4.4.7
- **HTTP Client**: Axios 1.6.2
- **Export**: xlsx 0.18.5

### DevOps & Automation
- **Workflow**: N8N (Docker)
- **Container**: Docker & Docker Compose
- **Tunneling**: Ngrok (local development)

## 📦 Cài đặt

### Yêu cầu hệ thống

- Node.js v20 trở lên ([Download](https://nodejs.org/))
- MongoDB Atlas account ([Đăng ký miễn phí](https://www.mongodb.com/cloud/atlas))
- Docker & Docker Compose ([Download](https://www.docker.com/))
- Google Cloud Project với:
  - Cloud Storage bucket
  - Service account key (JSON file)
  - Gemini API enabled
- Apify account ([Đăng ký miễn phí](https://apify.com/))
- Ngrok account ([Đăng ký miễn phí](https://ngrok.com/))

### Bước 1: Clone repository

```bash
git clone <repository-url>
cd HDBank\ AIAutomation
```

### Bước 2: Cài đặt Backend

```bash
cd backend
npm install
```

**Tạo file `.env`** trong thư mục `backend`:
```env
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRE=7d

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Google Cloud Storage
GOOGLE_APPLICATION_CREDENTIALS=./gcs-key.json
GCS_BUCKET_NAME=your-gcs-bucket-name

# Apify API (Facebook scraping)
APIFY_API_KEY=your_apify_api_key_here

# N8N Integration
N8N_API_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key

# Backend URL (for N8N callbacks)
BACKEND_URL=http://localhost:5000

# Logging
LOG_LEVEL=info
```

**Đặt Google Cloud Service Account key**: Copy file `gcs-key.json` vào thư mục `backend/`

**Khởi động Backend**:
```bash
npm run dev
```
Server sẽ chạy tại: http://localhost:5000

### Bước 3: Cài đặt Frontend

```bash
cd frontend
npm install
```

**Tạo file `.env`** trong thư mục `frontend`:
```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=HDBank AI Automation
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Khởi động Frontend**:
```bash
npm run dev
```
Ứng dụng sẽ chạy tại: http://localhost:5173

### Bước 4: Cài đặt N8N (Optional)

```bash
cd n8n
```

**Tạo file `.env`** trong thư mục `n8n`:
```env
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_strong_password_here
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=http://localhost:5678/
GENERIC_TIMEZONE=Asia/Ho_Chi_Minh
```

**Khởi động N8N**:
```bash
docker-compose up -d
```
N8N UI sẽ chạy tại: http://localhost:5678

### Bước 5: Setup Ngrok (cho local development)

> **📖 Hướng dẫn chi tiết**: Xem [NGROK-SETUP.md](NGROK-SETUP.md)

**Tóm tắt nhanh:**

1. **Download ngrok**:
   - Truy cập: https://ngrok.com/download
   - Tải về và giải nén
   - Di chuyển file `ngrok.exe` vào thư mục `ngrok/` trong project

2. **Đăng ký và xác thực** (miễn phí):
   ```bash
   # Lấy authtoken từ: https://dashboard.ngrok.com/get-started/your-authtoken
   .\ngrok\ngrok.exe config add-authtoken YOUR_AUTHTOKEN
   ```

3. **Chạy ngrok**:
   ```bash
   # Windows
   start-ngrok.bat

   # Hoặc chạy trực tiếp
   .\ngrok\ngrok.exe http 5000
   ```

4. **Cập nhật `BACKEND_URL`** trong `backend/.env` với URL từ ngrok:
   ```env
   BACKEND_URL=https://your-unique-id.ngrok-free.app
   ```

5. **Restart backend** để áp dụng thay đổi

## 🚀 Sử dụng

### 1. Truy cập ứng dụng
Mở trình duyệt và truy cập: http://localhost:5173

### 2. Flow hoạt động cơ bản

```
┌─────────────────────────────────────────────────────────────┐
│ BƯỚC 1: Thu thập dữ liệu                                   │
│ • Upload file Excel/CSV hoặc                               │
│ • Nhập dữ liệu thủ công tại trang "Upload File"           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ BƯỚC 2: Chọn & Xử lý tin tức (SelectNews)                 │
│ • Xem danh sách tin từ 3 nguồn:                            │
│   - Sản phẩm & dịch vụ mới                                 │
│   - Tin tức ngân hàng                                      │
│   - Tin tức fintech                                        │
│ • Chọn checkbox "Selected" cho tin muốn đưa vào báo cáo   │
│ • Upload hoặc sinh ảnh bằng AI                             │
│ • Chỉnh sửa nội dung nếu cần                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ BƯỚC 3: Xem trước & Điều chỉnh (SummaryPages)             │
│ • Xem preview 4 trang báo cáo                              │
│ • Upload ảnh bổ sung cho Page 3 & 4                       │
│ • Nhập nội dung thủ công cho các nhóm trống               │
│ • Nhấn "Xác nhận báo cáo" để tạo report                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ BƯỚC 4: Xem báo cáo (ViewReport / HistoryReport)          │
│ • Xem báo cáo vừa tạo tại trang Home                       │
│ • Xem lịch sử báo cáo tại HistoryReport                    │
│ • Xuất file nếu cần                                        │
└─────────────────────────────────────────────────────────────┘
```

### 3. Các tính năng chính

#### 📰 Quản lý tin tức (SelectNews)
- **Lọc & Tìm kiếm**: Tìm theo từ khóa, lọc theo ngân hàng, chủ đề
- **Phân trang**: Hiển thị 10 tin/trang
- **Chọn tin**: Checkbox để đưa vào báo cáo
- **Upload ảnh**: Tải ảnh từ máy tính (base64 → GCS)
- **Sinh ảnh AI**: Tự động tạo ảnh từ nội dung bằng Gemini AI
- **Crawl content**: Tự động lấy nội dung chi tiết từ URL nguồn

#### 📊 Tạo báo cáo (SummaryPages)
- **Preview 4 trang**:
  - **Page 1**: Tổng hợp nhanh tin tức (tất cả tin đã chọn)
  - **Page 2**: So sánh sản phẩm theo ngân hàng + Chi tiết sản phẩm
  - **Page 3**: Tin tức ngân hàng theo chủ đề (Tỷ giá, Giá vàng, Xu hướng...)
  - **Page 4**: Tin tức fintech theo lĩnh vực ảnh hưởng
- **Upload ảnh**: Tối đa 2 ảnh/nhóm cho Page 3 & 4
- **Nội dung thủ công**: Nhập content cho nhóm trống (Tỷ giá, Giá vàng)
- **Auto-reset**: Sau khi tạo report, tất cả `selected=false` để tạo report mới

#### 👁️ Xem báo cáo (ViewReport)
- **4 sections** trên 1 trang với sticky navigation
- **Smooth scrolling** giữa các phần
- **Responsive design**: Tối ưu cho desktop & mobile
- **Back button**: Quay lại danh sách báo cáo

#### 📜 Lịch sử (HistoryReport)
- Danh sách tất cả báo cáo đã tạo
- Phân trang 10 báo cáo/trang
- Click để xem chi tiết báo cáo

## 🔌 API Endpoints

### Data Management (`/api/data`)
```
GET    /new-products              Lấy danh sách sản phẩm mới
GET    /market-trends             Lấy tin tức ngân hàng
GET    /fintech-news              Lấy tin tức fintech
GET    /all                       Lấy tất cả tin từ 3 nguồn
GET    /summary-selected          Lấy tất cả tin đã chọn (selected=true)

PATCH  /update-image/:collection/:id        Cập nhật ảnh
POST   /upload-image/:collection/:id        Upload ảnh mới (base64 → GCS)
POST   /generate-image/:collection/:id      Sinh ảnh bằng AI
POST   /crawl-content/:collection/:id       Crawl nội dung từ URL nguồn
PATCH  /update-field/:collection/:id        Cập nhật field bất kỳ
```

### Report Management (`/api/reports`)
```
POST   /create                    Tạo báo cáo mới từ tin đã chọn
GET    /latest                    Lấy báo cáo mới nhất
GET    /:id                       Lấy báo cáo theo ID
GET    /                          Lấy danh sách báo cáo (có phân trang)
                                 Query: ?page=1&limit=10
```

### N8N Integration (`/api/n8n`)
```
POST   /trigger-workflow          Khởi chạy N8N workflow
GET    /job/:jobId                Kiểm tra trạng thái job
POST   /workflow-callback/:jobId  Callback từ N8N khi hoàn thành
```

## 📁 Cấu trúc Database

### Collections

#### 1️⃣ NewProductService (Sản phẩm & Dịch vụ mới)
```javascript
{
  bank: String | [String],           // Ngân hàng
  product_name: String,               // Tên sản phẩm/dịch vụ
  product_segment: [String],          // [Phân khúc level 1, level 2]
  description: String,                // Mô tả ngắn
  image: String,                      // GCS URL
  selected: Boolean,                  // Đã chọn vào báo cáo?
  reportSelected: Boolean,            // Đã có trong báo cáo?
  detail_content: String,             // Nội dung chi tiết (từ crawl)
  source_of_detail: String,           // Nguồn chi tiết
  source_url: String,                 // URL gốc
  source_type: String,                // "SOCIAL", "WEB", "WEB_PDF"
  date_published: Date | String,
}
```

#### 2️⃣ BankingMarketTrend (Tin tức Ngân hàng)
```javascript
{
  topic_group: String,                // "Tỷ giá", "Xu hướng", "Chính sách"...
  title: String,                      // Tiêu đề
  summary: String,                    // Tóm tắt
  bank_related: String | [String],    // Ngân hàng liên quan
  image: String,                      // GCS URL
  selected: Boolean,
  reportSelected: Boolean,
  detail_content: String,
  source_of_detail: String,
  source_url: String,
  published_date: Date | String,
}
```

#### 3️⃣ FintechNews (Tin tức Fintech)
```javascript
{
  fintech_topic: String,              // Chủ đề fintech
  area_affected: String | [String],   // Lĩnh vực ảnh hưởng
  title: String,                      // Tiêu đề
  summary: String,                    // Tóm tắt
  organization: String,               // Tổ chức/công ty
  image: String,                      // GCS URL
  selected: Boolean,
  reportSelected: Boolean,
  detail_content: String,
  source_of_detail: String,
  source_url: String,
  published_date: Date | String,
}
```

#### 4️⃣ Report (Báo cáo đã tạo)
```javascript
{
  startDate: String,                  // Ngày bắt đầu
  endDate: String,                    // Ngày kết thúc
  dateRange: String,                  // "DD/MM/YYYY - DD/MM/YYYY"
  page1: [Page1Item],                 // Tất cả tin đã chọn
  page2: {                            // So sánh & chi tiết sản phẩm
    comparisonTable: {...},
    summaryList: [String],
    contentCards: [{...}]
  },
  page3: [{                           // Tin ngân hàng theo topic_group
    topic_group: String,
    items: [{...}],
    images: [String],                 // Max 2 ảnh
    manualContent: String             // Nội dung thủ công
  }],
  page4: [{                           // Tin fintech theo area_affected
    area_affected: String,
    items: [{...}],
    images: [String]                  // Max 2 ảnh
  }],
  totalItems: Number,                 // Tổng số tin
  createdAt: Date,
  updatedAt: Date
}
```

## 🧪 Testing & Development

### Backend
```bash
cd backend

# Development mode (auto-reload)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint
```

### Frontend
```bash
cd frontend

# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

## 🐛 Troubleshooting

### 1. MongoDB connection error
```
Error: MongoNetworkError: failed to connect to server
```
**Giải pháp**:
- Kiểm tra `MONGODB_URI` trong `.env`
- Đảm bảo IP hiện tại được whitelist trên MongoDB Atlas
- Kiểm tra username/password

### 2. GCS upload failed
```
Error: Could not load the default credentials
```
**Giải pháp**:
- Kiểm tra file `gcs-key.json` tồn tại trong `backend/`
- Kiểm tra `GOOGLE_APPLICATION_CREDENTIALS` trong `.env`
- Kiểm tra permissions của service account

### 3. Ngrok tunnel closed
```
ERR_NGROK_108
```
**Giải pháp**:
- Free tier ngrok có giới hạn thời gian tunnel
- Restart ngrok và cập nhật `BACKEND_URL` mới trong `.env`
- Restart backend sau khi update URL

### 4. Frontend không kết nối được Backend
```
Network Error
```
**Giải pháp**:
- Kiểm tra Backend đang chạy tại port 5000
- Kiểm tra `VITE_API_URL` trong `frontend/.env`
- Tắt CORS blocker trên browser nếu cần

### 5. Gemini API quota exceeded
```
Error 429: Resource has been exhausted
```
**Giải pháp**:
- Kiểm tra quota tại [Google AI Studio](https://aistudio.google.com/)
- Đợi quota reset (thường reset hàng ngày)
- Nâng cấp lên paid tier nếu cần

## 📊 Giới hạn hệ thống

- **MongoDB Document Size**: Max 16MB/document
  - Content được truncate tự động (max 30KB/item)
  - Images được giới hạn (max 2 images/group)
- **GCS Upload**: Max 10MB/file (tuỳ chỉnh được)
- **Gemini API**:
  - Free tier: 15 requests/minute
  - Paid tier: 60 requests/minute
- **Apify API**:
  - Free tier: 100 actor runs/month
  - 1 crawl ≈ 1 actor run

## 🔐 Bảo mật

### Best Practices đã áp dụng:
- ✅ JWT authentication với expiration
- ✅ Environment variables cho sensitive data
- ✅ CORS configured
- ✅ Input validation với Joi
- ✅ `.gitignore` cho credentials files
- ✅ GCS với bucket-level IAM (read-only public)
- ✅ MongoDB connection với SSL/TLS

### Khuyến nghị cho Production:
- 🔒 Enable HTTPS (SSL/TLS)
- 🔒 Use environment-specific configs
- 🔒 Set up rate limiting
- 🔒 Enable MongoDB authentication
- 🔒 Use secrets management (AWS Secrets Manager, Google Secret Manager)
- 🔒 Implement request logging & monitoring
- 🔒 Set up backup strategy for MongoDB

## 📝 Scripts hữu ích

### Backend
```bash
# Start development server
npm run dev

# Start production server
npm start

# Run all tests
npm test

# Lint code
npm run lint
```

### Frontend
```bash
# Start dev server (HMR enabled)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Lint code
npm run lint
```

### N8N
```bash
# Start N8N container
docker-compose up -d

# Stop N8N container
docker-compose down

# View logs
docker-compose logs -f

# Restart container
docker-compose restart
```

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

ISC

## 👥 Team

HDBank Intern Team 2025

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra [Troubleshooting](#-troubleshooting) section
2. Xem [Issues](../../issues) đã có
3. Tạo Issue mới với đầy đủ thông tin:
   - Mô tả lỗi
   - Steps to reproduce
   - Screenshots nếu có
   - Environment info (OS, Node version, etc.)

---

**Built with ❤️ by HDBank AI Automation Team**
