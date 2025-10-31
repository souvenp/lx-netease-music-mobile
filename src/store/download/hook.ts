import { useEffect, useState } from 'react';
import state from './state';

export const useDownloadTasks = () => {
  const [tasks, setTasks] = useState([...state.tasks]);

  useEffect(() => {
    const handleUpdate = () => {
      setTasks([...state.tasks]);
    };
    global.app_event.on('download_list_changed', handleUpdate);
    return () => {
      global.app_event.off('download_list_changed', handleUpdate);
    };
  }, []);

  return tasks;
};
