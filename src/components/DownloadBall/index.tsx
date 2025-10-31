import { memo, useState, useEffect, useRef, useMemo } from 'react';
import { View, TouchableOpacity, Animated, Easing } from 'react-native';
import * as Progress from 'react-native-progress';
import { Icon } from '@/components/common/Icon';
import { useTheme } from '@/store/theme/hook';
import { createStyle } from '@/utils/tools';
import { navigations } from '@/navigation';
import commonState from '@/store/common/state';
import DownloadTask = LX.Download.DownloadTask;

export default memo(() => {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTasks, setActiveTasks] = useState<Map<string, DownloadTask>>(new Map());
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const { totalProgress, isCompleted } = useMemo(() => {
    if (activeTasks.size === 0) return { totalProgress: 0, isCompleted: true };

    let currentProgress = 0;
    for (const task of activeTasks.values()) {
      currentProgress += task.progress.percent;
    }
    const totalProgress = currentProgress / activeTasks.size;

    // 检查是否所有活动任务都已完成/失败
    const allFinished = Array.from(activeTasks.values()).every(t => t.status === 'completed' || t.status === 'error');

    return { totalProgress, isCompleted: allFinished };
  }, [activeTasks]);

  // 监听任务状态和进度变化
  useEffect(() => {
    const handleTaskAdd = (task: LX.Download.DownloadTask) => {
      if (!isVisible) {
        setIsVisible(true);
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      }
      setActiveTasks(prev => new Map(prev).set(task.id, task));
    };

    const handleProgressUpdate = ({ id, progress }: { id: string, progress: LX.Download.DownloadTask['progress'] }) => {
      setActiveTasks(prev => {
        if (!prev.has(id)) return prev;
        const newTasks = new Map(prev);
        const task = newTasks.get(id)!;
        newTasks.set(id, { ...task, progress });
        return newTasks;
      });
    };

    const handleStatusUpdate = ({ id, status }: { id: string, status: LX.Download.DownloadTask['status'] }) => {
      setActiveTasks(prev => {
        if (!prev.has(id)) return prev;
        const newTasks = new Map(prev);
        const task = newTasks.get(id)!;
        newTasks.set(id, { ...task, status });
        return newTasks;
      });
    };

    global.app_event.on('download_task_add', handleTaskAdd);
    global.app_event.on('download_progress_update', handleProgressUpdate);
    global.app_event.on('download_status_update', handleStatusUpdate);

    return () => {
      global.app_event.off('download_task_add', handleTaskAdd);
      global.app_event.off('download_progress_update', handleProgressUpdate);
      global.app_event.off('download_status_update', handleStatusUpdate);
    };
  }, [isVisible, scaleAnim]);

  // 完成动画
  useEffect(() => {
    if(isVisible && isCompleted && activeTasks.size > 0) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [isCompleted, isVisible, activeTasks.size, scaleAnim])


  const handlePress = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      setActiveTasks(new Map()); // 清空状态以便下次出现
    });
    navigations.pushDownloadManagerScreen(commonState.componentIds.home!);
  };

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handlePress}>
        <Progress.Circle
          size={50}
          progress={totalProgress}
          showsText={false}
          color={isCompleted ? theme['c-success'] : theme['c-primary']}
          unfilledColor="rgba(0,0,0,0.2)"
          borderWidth={0}
          thickness={3}
        />
        <View style={styles.iconContainer}>
          <Icon name={isCompleted ? "checkbox-marked" : "download-2"} size={22} color={isCompleted ? theme['c-success'] : theme['c-primary-font-active']} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = createStyle({
  container: {
    position: 'absolute',
    bottom: 70,
    right: 15,
    zIndex: 100,
  },
  iconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
