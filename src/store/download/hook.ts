import { useEffect, useState } from 'react';
import state from './state';

export const useDownloadTasks = () => {
  const [tasks, setTasks] = useState([...state.tasks]);

  useEffect(() => {
    // 合并批量状态通知，避免千首任务每次更新都复制整个列表并重新渲染。
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handleUpdate = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        setTasks([...state.tasks]);
      }, 100);
    };
    global.app_event.on('download_list_changed', handleUpdate);
    return () => {
      clearTimeout(timer);
      global.app_event.off('download_list_changed', handleUpdate);
    };
  }, []);

  return tasks;
};
