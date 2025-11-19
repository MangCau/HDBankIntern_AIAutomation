import { useState } from 'react'
import '../App.css'

// Mock data cho demo - sẽ thay bằng data thật từ API
const MOCK_RECENT_FILES = [
  { id: 1, name: 'Báo cáo tài chính Q4-2024.pdf', uploadDate: '2025-01-18', size: 2547896 },
  { id: 2, name: 'Chính sách tín dụng mới.docx', uploadDate: '2025-01-17', size: 1258964 },
  { id: 3, name: 'Hướng dẫn sản phẩm.pdf', uploadDate: '2025-01-15', size: 3891456 }
]

const MOCK_RECENT_LINKS = [
  { id: 1, url: 'https://hdbank.com.vn/tin-tuc/san-pham-moi-2025', addedDate: '2025-01-18' },
  { id: 2, url: 'https://techcombank.com.vn/bao-cao-tai-chinh', addedDate: '2025-01-16' },
  { id: 3, url: 'https://vpbank.com.vn/cong-nghe-banking', addedDate: '2025-01-14' }
]

function UploadFile() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [webLink, setWebLink] = useState('')
  const [dragActive, setDragActive] = useState(false)

  // Xử lý chọn file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setSelectedFiles([...selectedFiles, ...filesArray])
    }
  }

  // Xử lý drag & drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const filesArray = Array.from(e.dataTransfer.files)
      setSelectedFiles([...selectedFiles, ...filesArray])
    }
  }

  // Xóa file khỏi danh sách
  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
  }

  // Xử lý submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedFiles.length === 0 && !webLink.trim()) {
      alert('Vui lòng tải lên file hoặc nhập link!')
      return
    }

    // TODO: Gọi API upload file và link
    console.log('Files:', selectedFiles)
    console.log('Web link:', webLink)
    alert('Đã gửi thành công!')

    // Reset form
    setSelectedFiles([])
    setWebLink('')
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="page-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className='logo-img'></div>

        {/* Thống kê nhanh */}
        <div className="sidebar-section">
          <h3 className="section-title">THỐNG KÊ NHANH</h3>
          <div className="section-content">
            <div className="stat-item">
              <span className="stat-label">File đã upload</span>
              <span className="stat-value">{MOCK_RECENT_FILES.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Link web đã nhập</span>
              <span className="stat-value">{MOCK_RECENT_LINKS.length}</span>
            </div>
          </div>
        </div>

        {/* Gần đây */}
        <div className="sidebar-section">
          <h3 className="section-title">GẦN ĐÂY</h3>
          <div className="section-content">
            {/* Danh sách file đã upload */}
            <div className="recent-section">
              <h4 className="recent-subtitle">File đã tải lên</h4>
              <div className="recent-list">
                {MOCK_RECENT_FILES.map((file) => (
                  <div key={file.id} className="recent-item">
                    <div className="recent-icon">📄</div>
                    <div className="recent-info">
                      <p className="recent-name" title={file.name}>{file.name}</p>
                      <p className="recent-date">{formatDate(file.uploadDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Danh sách link đã nhập */}
            <div className="recent-section">
              <h4 className="recent-subtitle">Link đã nhập</h4>
              <div className="recent-list">
                {MOCK_RECENT_LINKS.map((link) => (
                  <div key={link.id} className="recent-item">
                    <div className="recent-icon">🔗</div>
                    <div className="recent-info">
                      <p className="recent-name" title={link.url}>{link.url}</p>
                      <p className="recent-date">{formatDate(link.addedDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-header">
          <h1>Tải lên tài liệu</h1>
          <p className="content-subtitle">Tải lên file PDF, DOCX hoặc nhập link website để phân tích</p>
        </div>

        <div className="upload-content">
          <form onSubmit={handleSubmit} className="upload-form">
            {/* File Upload Section */}
            <div className="upload-section">
              <h2 className="section-heading">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Tải lên file
              </h2>

              <div
                className={`file-drop-zone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="drop-zone-content">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                  </svg>
                  <p className="drop-zone-title">Kéo thả file vào đây</p>
                  <p className="drop-zone-subtitle">hoặc</p>
                  <label htmlFor="file-input" className="file-input-label">
                    Chọn file từ máy tính
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.docx,.doc"
                    multiple
                    onChange={handleFileChange}
                    className="file-input-hidden"
                  />
                  <p className="drop-zone-info">Hỗ trợ: PDF, DOCX (tối đa 10MB mỗi file)</p>
                </div>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="selected-files">
                  <h3 className="selected-files-title">File đã chọn ({selectedFiles.length})</h3>
                  <div className="files-list">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        <div className="file-icon">
                          {file.name.endsWith('.pdf') ? '📄' : '📝'}
                        </div>
                        <div className="file-info">
                          <p className="file-name">{file.name}</p>
                          <p className="file-size">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="file-remove-btn"
                          title="Xóa file"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="upload-divider">
              <span>HOẶC</span>
            </div>

            {/* Web Link Section */}
            <div className="upload-section">
              <h2 className="section-heading">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Nhập link website
              </h2>

              <div className="link-input-wrapper">
                <input
                  type="url"
                  value={webLink}
                  onChange={(e) => setWebLink(e.target.value)}
                  placeholder="https://example.com/article"
                  className="link-input"
                />
                {webLink && (
                  <button
                    type="button"
                    onClick={() => setWebLink('')}
                    className="link-clear-btn"
                    title="Xóa link"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="link-help-text">Nhập URL của bài viết hoặc trang web cần phân tích</p>
            </div>

            {/* Submit Button */}
            <div className="upload-actions">
              <button type="submit" className="submit-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Gửi tài liệu
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default UploadFile
