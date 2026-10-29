import { getData, saveData } from '@/plugins/storage';
import { storageDataPrefix } from '@/config/constant';

const DOWNLOAD_TASKS_KEY = storageDataPrefix.downloadList;

export const normalizeDownloadTasks = (tasks: LX.Download.DownloadTask[]): LX.Download.DownloadTask[] =>
  tasks.map(task => {
    task = {
      ...task,
      target: task.target ?? 'local',
    };
    if (task.status === 'downloading' || task.status === 'waiting') {
      return { ...task, status: 'paused' };
    }
    return task;
  });

export const normalizeDownloadTasksForSync = (tasks: LX.Download.DownloadTask[]): LX.Download.DownloadTask[] =>
  tasks.map(task => ({
    ...task,
    status: 'paused',
    errorMsg: '',
    isRemoteSynced: false,
    webdavReady: undefined,
    webdavAudioUploaded: undefined,
    webdavLyricUploaded: undefined,
    webdavLyricPath: undefined,
    progress: {
      ...task.progress,
      percent: 0,
      speed: '',
      downloaded: 0,
    },
    metadataStatus: {
      cover: 'pending',
      lyric: 'pending',
      tags: 'pending',
    },
  }));

export const normalizeRemoteSyncedDownloadTasks = (tasks: LX.Download.DownloadTask[]): LX.Download.DownloadTask[] =>
  normalizeDownloadTasksForSync(tasks).map(task => ({
    ...task,
    isRemoteSynced: true,
  }));

export const getDownloadTasks = async (): Promise<LX.Download.DownloadTask[]> => {
  const tasks = await getData<LX.Download.DownloadTask[]>(DOWNLOAD_TASKS_KEY);
  return normalizeDownloadTasks(tasks || []);
};

export const saveDownloadTasks = async (tasks: LX.Download.DownloadTask[]) => {
  await saveData(DOWNLOAD_TASKS_KEY, tasks);
};
