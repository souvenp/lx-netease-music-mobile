import state from './state';
import DownloadTask = LX.Download.DownloadTask;
import { saveDownloadTasks } from '@/utils/data/download';
import { throttle } from '@/utils';
import { markListsChanged } from '@/core/sync/webdavSync';

const throttledSave = throttle(() => {
  void saveDownloadTasks(state.tasks);
}, 1000);

const shouldSyncTaskChange = (updatedFields: Partial<DownloadTask>) => {
  const ignoredSyncKeys: Array<keyof DownloadTask> = [
    'progress',
    'status',
    'errorMsg',
    'metadataStatus',
    'webdavReady',
    'webdavAudioUploaded',
    'webdavLyricUploaded',
    'webdavLyricPath',
  ];
  return Object.keys(updatedFields).some(key => !ignoredSyncKeys.includes(key as keyof DownloadTask));
};

export default {
  setTasks(tasks: LX.Download.DownloadTask[]) {
    state.tasks = tasks;
    global.app_event.download_list_changed();
  },
  addTask(task: DownloadTask) {
    state.tasks.unshift(task);
    global.app_event.download_list_changed();
    global.app_event.download_task_add(task);
    markListsChanged();
    throttledSave();
  },
  updateTask(id: string, updatedFields: Partial<DownloadTask>) {
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    if (taskIndex > -1) {
      Object.assign(state.tasks[taskIndex], updatedFields);
      global.app_event.download_list_changed();
      if (updatedFields.progress) {
        global.app_event.download_progress_update({ id, progress: updatedFields.progress });
      }
      if (updatedFields.status) {
        global.app_event.download_status_update({ id, status: updatedFields.status, errorMsg: updatedFields.errorMsg });
      }
      if (updatedFields.metadataStatus) {
        global.app_event.download_metadata_update({ id, metadataStatus: updatedFields.metadataStatus });
      }
      if (shouldSyncTaskChange(updatedFields)) markListsChanged();
      throttledSave();
    }
  },
  removeTask(id: string) {
    const index = state.tasks.findIndex(t => t.id === id);
    if (index > -1) {
      state.tasks.splice(index, 1);
      global.app_event.download_list_changed();
      markListsChanged();
      throttledSave();
    }
  },
  clearTasks() {
    state.tasks = [];
    global.app_event.download_list_changed();
    markListsChanged();
    throttledSave();
  },
};
