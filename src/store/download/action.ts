import state from './state';
import DownloadTask = LX.Download.DownloadTask;
import {saveDownloadTasks} from "@/utils/data/download.ts";
import {throttle} from "@/utils";


const throttledSave = throttle(() => {
  void saveDownloadTasks(state.tasks);
}, 1000);

export default {
  setTasks(tasks: LX.Download.DownloadTask[]) {
    state.tasks = tasks;
    global.app_event.emit('download_list_changed');
  },
  addTask(task: DownloadTask) {
    // 插入到列表顶部
    state.tasks.unshift(task);
    global.app_event.emit('download_list_changed');
    global.app_event.emit('download_task_add', task);
    throttledSave();
  },
  updateTask(id: string, updatedFields: Partial<DownloadTask>) {
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    if (taskIndex > -1) {
      Object.assign(state.tasks[taskIndex], updatedFields);
      global.app_event.emit('download_list_changed');
      if (updatedFields.progress) {
        global.app_event.emit('download_progress_update', { id, progress: updatedFields.progress });
      }
      if (updatedFields.status) {
        global.app_event.emit('download_status_update', { id, status: updatedFields.status, errorMsg: updatedFields.errorMsg });
      }
      throttledSave();
    }
  },
  removeTask(id: string) {
    const index = state.tasks.findIndex(t => t.id === id);
    if (index > -1) {
      state.tasks.splice(index, 1);
      global.app_event.emit('download_list_changed');
      throttledSave();
    }
  },
  clearTasks() {
    state.tasks = [];
    global.app_event.emit('download_list_changed');
    throttledSave();
  },
};
