import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface Job {
  id: string
  status: 'processing' | 'completed' | 'failed'
  startDate: string
  endDate: string
  createdAt: Date
  completedAt?: Date
  result?: any
  error?: string
  progress?: number
}

interface JobContextType {
  currentJob: Job | null
  startJob: (jobId: string, startDate: string, endDate: string) => void
  updateJobStatus: (status: 'processing' | 'completed' | 'failed', result?: any, error?: string) => void
  clearJob: () => void
  isProcessing: boolean
}

const JobContext = createContext<JobContextType | undefined>(undefined)

export const JobProvider = ({ children }: { children: ReactNode }) => {
  const [currentJob, setCurrentJob] = useState<Job | null>(null)

  // Load job from localStorage on mount
  useEffect(() => {
    const savedJob = localStorage.getItem('currentJob')
    if (savedJob) {
      try {
        const job = JSON.parse(savedJob)
        job.createdAt = new Date(job.createdAt)
        if (job.completedAt) job.completedAt = new Date(job.completedAt)
        setCurrentJob(job)
      } catch (e) {
        console.error('Failed to load saved job:', e)
        localStorage.removeItem('currentJob')
      }
    }
  }, [])

  // Save job to localStorage whenever it changes
  useEffect(() => {
    if (currentJob) {
      localStorage.setItem('currentJob', JSON.stringify(currentJob))
    } else {
      localStorage.removeItem('currentJob')
    }
  }, [currentJob])

  const startJob = (jobId: string, startDate: string, endDate: string) => {
    const newJob: Job = {
      id: jobId,
      status: 'processing',
      startDate,
      endDate,
      createdAt: new Date(),
    }
    setCurrentJob(newJob)
  }

  const updateJobStatus = (status: 'processing' | 'completed' | 'failed', result?: any, error?: string) => {
    if (!currentJob) return

    setCurrentJob({
      ...currentJob,
      status,
      result,
      error,
      completedAt: status !== 'processing' ? new Date() : undefined,
    })
  }

  const clearJob = () => {
    setCurrentJob(null)
  }

  const isProcessing = currentJob?.status === 'processing'

  return (
    <JobContext.Provider value={{ currentJob, startJob, updateJobStatus, clearJob, isProcessing }}>
      {children}
    </JobContext.Provider>
  )
}

export const useJob = () => {
  const context = useContext(JobContext)
  if (context === undefined) {
    throw new Error('useJob must be used within a JobProvider')
  }
  return context
}
