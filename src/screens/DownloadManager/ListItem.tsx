import { memo, useMemo, useCallback, useState, useEffect } from 'react'; // 新增 useState, useEffect
import { View, TouchableOpacity } from 'react-native';
import Text from '@/components/common/Text';
import Image from '@/components/common/Image';
import { Icon } from '@/components/common/Icon';
import ProgressBar from '@/components/player/ProgressBar';
import { useTheme } from '@/store/theme/hook';
import { createStyle } from '@/utils/tools';
import {dateFormat, sizeFormate} from '@/utils/common';
import { retryTask } from '@/core/download';

export default memo(({ task: initialTask, onRemove }: { task: LX.Download.DownloadTask, onRemove: (id: string) => void }) => {
  const theme = useTheme();
  const [task, setTask] = useState(initialTask);

  useEffect(() => {
    const handleProgressUpdate = ({ id, progress }: { id: string, progress: LX.Download.DownloadTask['progress'] }) => {
      if (id === task.id) {
        setTask(prevTask => ({ ...prevTask, progress }));
      }
    };

    const handleStatusUpdate = ({ id, status, errorMsg }: { id: string, status: LX.Download.DownloadTask['status'], errorMsg?: string }) => {
      if (id === task.id) {
        setTask(prevTask => ({ ...prevTask, status, errorMsg }));
      }
    };

    // 我们需要让 downloadActions 在更新 status 时也广播 errorMsg
    global.app_event.on('download_progress_update', handleProgressUpdate);
    global.app_event.on('download_status_update', handleStatusUpdate);

    // 当从父组件接收到的 initialTask 发生变化时（例如列表刷新），也更新内部状态
    setTask(initialTask);

    return () => {
      global.app_event.off('download_progress_update', handleProgressUpdate);
      global.app_event.off('download_status_update', handleStatusUpdate);
    };
  }, [task.id, initialTask]); // 依赖 task.id 和 initialTask


  const hasMetaError = useMemo(() => Object.values(task.metadataStatus).includes('fail'), [task.metadataStatus]);

  const handleRetry = useCallback(() => {
    retryTask(task.id);
  }, [task.id]);

  const renderStatus = () => {
    switch(task.status) {
      case 'downloading':
        return (
          <View>
            <ProgressBar progress={task.progress.percent} duration={1} buffered={0} />
            <View style={styles.progressDetails}>
              <Text size={10} color={theme['c-font-label']}>
                {sizeFormate(task.progress.downloaded)} / {sizeFormate(task.progress.total)}
              </Text>
              <Text size={10} color={theme['c-font-label']}>
                {task.progress.speed}
              </Text>
            </View>
          </View>
        );
      case 'completed':
        return <Text size={12} color={theme['c-primary']}>已完成</Text>;
      case 'error':
        return <Text size={12} color={theme['c-error']} numberOfLines={1}>{task.errorMsg || '下载失败'}</Text>;
      case 'paused':
        return <Text size={12} color={theme['c-font-label']}>已暂停</Text>;
      case 'waiting':
        return <Text size={12} color={theme['c-font-label']}>等待中...</Text>;
      default:
        return null;
    }
  };

  const renderMetadataStatus = () => (
    <View style={styles.metadataContainer}>
      <View style={styles.metaItem}>
        <Icon name={task.metadataStatus.tags === 'success' ? 'checkbox-marked' : (task.metadataStatus.tags === 'fail' ? 'close' : 'checkbox-blank-outline')} color={task.metadataStatus.tags === 'success' ? theme['c-primary'] : (task.metadataStatus.tags === 'fail' ? theme['c-error'] : theme['c-font-label'])} size={12} />
        <Text size={10} color={theme['c-font-label']}>标签</Text>
      </View>
      <View style={styles.metaItem}>
        <Icon name={task.metadataStatus.cover === 'success' ? 'checkbox-marked' : (task.metadataStatus.cover === 'fail' ? 'close' : 'checkbox-blank-outline')} color={task.metadataStatus.cover === 'success' ? theme['c-primary'] : (task.metadataStatus.cover === 'fail' ? theme['c-error'] : theme['c-font-label'])} size={12} />
        <Text size={10} color={theme['c-font-label']}>封面</Text>
      </View>
      <View style={styles.metaItem}>
        <Icon name={task.metadataStatus.lyric === 'success' ? 'checkbox-marked' : (task.metadataStatus.lyric === 'fail' ? 'close' : 'checkbox-blank-outline')} color={task.metadataStatus.lyric === 'success' ? theme['c-primary'] : (task.metadataStatus.lyric === 'fail' ? theme['c-error'] : theme['c-font-label'])} size={12} />
        <Text size={10} color={theme['c-font-label']}>歌词</Text>
      </View>
      {hasMetaError && task.status === 'completed' && (
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Icon name="available_updates" size={14} color={theme['c-primary-font-active']} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Image url={task.musicInfo.meta.picUrl} style={styles.artwork} />
      <View style={styles.info}>
        <Text numberOfLines={1}>
          {task.musicInfo.name}
          <Text size={12} color={theme['c-font-label']}>  {task.musicInfo.singer}</Text>
        </Text>
        <View style={styles.detailsRow}>
          <Text size={11} color={theme['c-font-label']}>{task.quality.toUpperCase()}</Text>
          {task.status === 'completed' && task.progress.total > 0 &&
            <Text size={11} color={theme['c-font-label']}> • {sizeFormate(task.progress.total)}</Text>
          }
          <Text size={11} color={theme['c-font-label']}> • {dateFormat(task.createdAt, 'Y-M-D h:m')}</Text>
        </View>
        {renderStatus()}
        {task.status === 'completed' && renderMetadataStatus()}
      </View>
      <View style={styles.actionsContainer}>
        { (task.status === 'error' || (task.status === 'completed' && hasMetaError)) && (
          <TouchableOpacity onPress={handleRetry} style={styles.actionButton}>
            <Icon name="available_updates" size={18} color={theme['c-primary-font-active']} />
          </TouchableOpacity>
        ) }
        <TouchableOpacity onPress={() => onRemove(task.id)} style={styles.actionButton}>
          <Icon name="close" size={16} color={theme['c-font-label']} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = createStyle({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  artwork: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  info: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
    gap: 4,
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 4,
  },
  actionButton: {
    padding: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  retryButton: {
    marginLeft: 'auto',
    padding: 4,
  }
});
