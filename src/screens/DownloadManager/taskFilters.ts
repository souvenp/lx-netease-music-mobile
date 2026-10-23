// 下载筛选类别；待处理包含排队和中断的任务。
export type TaskFilter = 'all' | 'downloading' | 'pending' | 'error' | 'completed'

// 元信息写入失败的本地任务也归入失败，便于统一修复。
export const isFailedTask = (task: LX.Download.DownloadTask) => task.status === 'error' || (
  task.status === 'completed' && task.target !== 'onedrive' && Object.values(task.metadataStatus).includes('fail')
)

// 每个任务只属于一个状态分组，避免完成和失败数量重复。
export const matchesTaskFilter = (task: LX.Download.DownloadTask, filter: TaskFilter) => {
  if (filter === 'all') return true
  if (filter === 'error') return isFailedTask(task)
  if (filter === 'pending') return task.status === 'waiting' || task.status === 'paused'
  if (filter === 'completed') return task.status === 'completed' && !isFailedTask(task)
  return task.status === 'downloading'
}
