import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

interface Report {
  _id: string
  dateRange: string
  startDate: string
  endDate: string
  totalItems: number
  createdAt: string
}

function HistoryReport() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const navigate = useNavigate()
  const itemsPerPage = 10

  // Fetch reports from API
  useEffect(() => {
    fetchReports()
  }, [currentPage])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:5000/api/reports?page=${currentPage}&limit=${itemsPerPage}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch reports')
      }

      setReports(result.data)
      setTotalPages(result.pagination.totalPages)
      setError(null)
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const handleViewReport = (reportId: string) => {
    navigate(`/report/${reportId}`)
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && reports.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Đang tải danh sách báo cáo...
      </div>
    )
  }

  if (error && reports.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
        gap: '16px'
      }}>
        <p style={{ fontSize: '18px', color: '#F00020' }}>Lỗi: {error}</p>
        <button
          onClick={() => fetchReports()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#F00020',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Thử lại
        </button>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '40px 20px'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px',
        borderBottom: '2px solid #F00020',
        paddingBottom: '16px'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#1a1a1a',
          marginBottom: '8px'
        }}>
          Lịch sử báo cáo
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Quản lý và xem lại các báo cáo đã tạo
        </p>
      </div>

      {/* Reports Table */}
      {reports.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          border: '2px dashed #ddd'
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{ margin: '0 auto 16px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p style={{ fontSize: '18px', color: '#666', marginBottom: '8px' }}>
            Chưa có báo cáo nào được tạo
          </p>
          <p style={{ fontSize: '14px', color: '#999' }}>
            Các báo cáo sẽ xuất hiện ở đây sau khi được tạo
          </p>
        </div>
      ) : (
        <>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #e0e0e0' }}>
                <tr>
                  <th style={tableHeaderStyle}>STT</th>
                  <th style={tableHeaderStyle}>Khoảng thời gian</th>
                  <th style={tableHeaderStyle}>Số lượng tin</th>
                  <th style={tableHeaderStyle}>Ngày tạo</th>
                  <th style={tableHeaderStyle}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, index) => (
                  <tr
                    key={report._id}
                    style={{
                      borderBottom: '1px solid #e0e0e0',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <td style={tableCellStyle}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td style={tableCellStyle}>
                      <strong>{report.dateRange}</strong>
                    </td>
                    <td style={tableCellStyle}>
                      <span style={{
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        {report.totalItems} tin
                      </span>
                    </td>
                    <td style={tableCellStyle}>{formatDate(report.createdAt)}</td>
                    <td style={tableCellStyle}>
                      <button
                        onClick={() => handleViewReport(report._id)}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: '#F00020',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#d00018'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F00020'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '32px'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentPage === 1 ? '#f0f0f0' : '#ffffff',
                  color: currentPage === 1 ? '#999' : '#F00020',
                  border: '2px solid ' + (currentPage === 1 ? '#ddd' : '#F00020'),
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ‹ Trước
              </button>

              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: currentPage === pageNum ? '#F00020' : '#ffffff',
                      color: currentPage === pageNum ? '#ffffff' : '#F00020',
                      border: '2px solid #F00020',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      minWidth: '40px'
                    }}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentPage === totalPages ? '#f0f0f0' : '#ffffff',
                  color: currentPage === totalPages ? '#999' : '#F00020',
                  border: '2px solid ' + (currentPage === totalPages ? '#ddd' : '#F00020'),
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Sau ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const tableHeaderStyle: React.CSSProperties = {
  padding: '16px',
  textAlign: 'left',
  fontSize: '14px',
  fontWeight: '700',
  color: '#FFD643',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
}

const tableCellStyle: React.CSSProperties = {
  padding: '16px',
  textAlign: 'left',
  fontSize: '15px',
  color: '#333'
}

export default HistoryReport
