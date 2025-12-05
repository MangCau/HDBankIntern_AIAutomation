import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface WorkflowNotification {
  show: boolean
  jobId: string | null
  type: 'success' | 'error'
  message: string
}

interface NotificationContextType {
  workflowNotification: WorkflowNotification
  showWorkflowSuccess: (jobId: string) => void
  showWorkflowError: (jobId: string, message: string) => void
  hideWorkflowNotification: () => void
  startMonitoringWorkflow: (jobId: string) => void
  stopMonitoringWorkflow: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const navigate = useNavigate()
  const [workflowNotification, setWorkflowNotification] = useState<WorkflowNotification>({
    show: false,
    jobId: null,
    type: 'success',
    message: ''
  })

  const [monitoringJobId, setMonitoringJobId] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Show success notification
  const showWorkflowSuccess = (jobId: string) => {
    setWorkflowNotification({
      show: true,
      jobId,
      type: 'success',
      message: 'Tóm tắt tin tức đã hoàn thành!'
    })
  }

  // Show error notification
  const showWorkflowError = (jobId: string, message: string) => {
    setWorkflowNotification({
      show: true,
      jobId,
      type: 'error',
      message
    })
  }

  // Hide notification
  const hideWorkflowNotification = () => {
    setWorkflowNotification({
      show: false,
      jobId: null,
      type: 'success',
      message: ''
    })
  }

  // Start monitoring workflow
  const startMonitoringWorkflow = (jobId: string) => {
    console.log('[NotificationContext] Start monitoring job:', jobId)
    setMonitoringJobId(jobId)
  }

  // Stop monitoring workflow
  const stopMonitoringWorkflow = () => {
    console.log('[NotificationContext] Stop monitoring')
    setMonitoringJobId(null)
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
  }

  // Polling effect - check job status periodically
  useEffect(() => {
    if (!monitoringJobId) {
      if (pollingInterval) {
        clearInterval(pollingInterval)
        setPollingInterval(null)
      }
      return
    }

    const checkJobStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/n8n/job/${monitoringJobId}`)
        const data = await response.json()

        console.log('[NotificationContext] Job status:', data)

        if (data.status === 'completed') {
          // Workflow completed successfully
          showWorkflowSuccess(monitoringJobId)
          stopMonitoringWorkflow()
        } else if (data.status === 'failed') {
          // Workflow failed
          showWorkflowError(monitoringJobId, data.error || 'Có lỗi xảy ra khi xử lý')
          stopMonitoringWorkflow()
        }
        // If status is 'processing', continue polling
      } catch (error) {
        console.error('[NotificationContext] Error checking job status:', error)
      }
    }

    // Initial check
    checkJobStatus()

    // Set up polling interval
    const interval = setInterval(checkJobStatus, 5000) // Poll every 5 seconds
    setPollingInterval(interval)

    return () => {
      clearInterval(interval)
    }
  }, [monitoringJobId])

  // Check localStorage on mount to resume monitoring
  useEffect(() => {
    const savedJobId = localStorage.getItem('selectNews_jobId')
    const savedIsProcessing = localStorage.getItem('selectNews_isProcessing')
    const savedWorkflowCompleted = localStorage.getItem('selectNews_workflowCompleted')

    if (savedJobId && savedIsProcessing === 'true' && savedWorkflowCompleted !== 'true') {
      console.log('[NotificationContext] Resuming monitoring for job:', savedJobId)
      startMonitoringWorkflow(savedJobId)
    }
  }, [])

  const value: NotificationContextType = {
    workflowNotification,
    showWorkflowSuccess,
    showWorkflowError,
    hideWorkflowNotification,
    startMonitoringWorkflow,
    stopMonitoringWorkflow
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Global Workflow Notification Popup */}
      {workflowNotification.show && (
        <div className="notification-popup-overlay">
          <div className="notification-popup">
            <div className={`notification-popup-content ${workflowNotification.type}`}>
              {/* Icon */}
              <div className="notification-popup-icon">
                {workflowNotification.type === 'success' ? '✅' : '❌'}
              </div>

              {/* Title & Message */}
              <div className="notification-popup-text">
                <h3>
                  {workflowNotification.type === 'success'
                    ? 'Hoàn thành!'
                    : 'Lỗi!'}
                </h3>
                <p>{workflowNotification.message}</p>
              </div>

              {/* Action Buttons */}
              <div className="notification-popup-actions">
                <button
                  className="btn-notification-primary"
                  onClick={() => {
                    hideWorkflowNotification()
                    navigate('/select-news')
                  }}
                >
                  📊 Xem báo cáo
                </button>
                <button
                  className="btn-notification-secondary"
                  onClick={hideWorkflowNotification}
                >
                  Ở lại trang này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  )
}
