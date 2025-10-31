import { getData, saveData } from '@/plugins/storage';
import { storageDataPrefix } from '@/config/constant';

const DOWNLOAD_TASKS_KEY = storageDataPrefix.downloadList;

export const getDownloadTasks = async (): Promise<LX.Download.DownloadTask[]> => {
  const tasks = await getData<LX.Download.DownloadTask[]>(DOWNLOAD_TASKS_KEY);
  // 恢复时，将正在下载中的任务置为暂停状态
  return (tasks || []).map(task => {
    if (task.status === 'downloading' || task.status === 'waiting') {
      return { ...task, status: 'paused' };
    }
    return task;
  });
};

export const saveDownloadTasks = async (tasks: LX.Download.DownloadTask[]) => {
  await saveData(DOWNLOAD_TASKS_KEY, tasks);
};
