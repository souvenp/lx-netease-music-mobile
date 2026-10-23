import { memo, useMemo, useCallback, useState, useEffect } from 'react'; // 新增 useState, useEffect
import { View, TouchableOpacity } from 'react-native';
import Text from '@/components/common/Text';
import Image from '@/components/common/Image';
import { Icon } from '@/components/common/Icon';
import ProgressBar from '@/components/player/ProgressBar';
import { useTheme } from '@/store/theme/hook';
import { createStyle } from '@/utils/tools';
import {dateFormat, sizeFormate} from '@/utils/common';
import { resumeTask, retryTask } from '@/core/download';

// 多选时整行负责勾选，并隐藏单项操作，避免点击穿透。
export default memo(({ task: initialTask, onRemove, selecting, selected, onSelect }: {
  task: LX.Download.DownloadTask, onRemove: (id: string) => void,
  selecting: boolean, selected: boolean, onSelect: (id: string) => void,
}) => {
  const theme = useTheme();
  const [task, setTask] = useState(initialTask);
  const errorColor = theme['c-600'];

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
    const handleMetadataUpdate = ({ id, metadataStatus }: { id: string, metadataStatus: LX.Download.DownloadTask['metadataStatus'] }) => {
      if (id === task.id) {
        setTask(prevTask => ({ ...prevTask, metadataStatus }));
      }
    }
    // 我们需要让 downloadActions 在更新 status 时也广播 errorMsg
    global.app_event.on('download_progress_update', handleProgressUpdate);
    global.app_event.on('download_status_update', handleStatusUpdate);
    global.app_event.on('download_metadata_update', handleMetadataUpdate);

    // 当从父组件接收到的 initialTask 发生变化时（例如列表刷新），也更新内部状态
    setTask(initialTask);

    return () => {
      global.app_event.off('download_progress_update', handleProgressUpdate);
      global.app_event.off('download_status_update', handleStatusUpdate);
      global.app_event.off('download_metadata_update', handleMetadataUpdate);
    };
  }, [task.id, initialTask]); // 依赖 task.id 和 initialTask


  const hasMetaError = useMemo(() => Object.values(task.metadataStatus).includes('fail'), [task.metadataStatus]);
  const canRetryMetadata = task.target !== 'onedrive';

  const handleRetry = useCallback(() => {
    retryTask(task.id);
  }, [task.id]);

  const handleResume = useCallback(() => {
    void resumeTask(task.id);
  }, [task.id]);

  const renderStatus = () => {
    if (task.isRemoteSynced) {
      return <Text size={12} color={theme['c-font-label']}>由其他设备同步或导入的下载记录</Text>;
    }

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
        return (
          <Text size={12} color={theme['c-primary']} numberOfLines={1}>
            {task.target === 'onedrive'
              ? `已上传到 OneDrive${task.remotePath ? `：${task.remotePath}` : ''}`
              : '已完成'}
          </Text>
        );
      case 'error':
        return <Text size={12} color={errorColor} numberOfLines={1}>{task.errorMsg || '下载失败'}</Text>;
      case 'paused':
        return <Text size={12} color={theme['c-font-label']}>已中断，可继续下载</Text>;
      case 'waiting':
        return <Text size={12} color={theme['c-font-label']}>等待中...</Text>;
      default:
        return null;
    }
  };

  const renderMetadataStatus = () => (
    <View style={styles.metadataContainer}>
      <View style={styles.metaItem}>
        <Icon name={task.metadataStatus.tags === 'success' ? 'checkbox-marked' : (task.metadataStatus.tags === 'fail' ? 'close' : 'checkbox-blank-outline')} color={task.metadataStatus.tags === 'success' ? theme['c-primary'] : (task.metadataStatus.tags === 'fail' ? errorColor : theme['c-font-label'])} size={12} />
        <Text size={10} color={theme['c-font-label']}>标签</Text>
      </View>
      <View style={styles.metaItem}>
        <Icon name={task.metadataStatus.cover === 'success' ? 'checkbox-marked' : (task.metadataStatus.cover === 'fail' ? 'close' : 'checkbox-blank-outline')} color={task.metadataStatus.cover === 'success' ? theme['c-primary'] : (task.metadataStatus.cover === 'fail' ? errorColor : theme['c-font-label'])} size={12} />
        <Text size={10} color={theme['c-font-label']}>封面</Text>
      </View>
      <View style={styles.metaItem}>
        <Icon name={task.metadataStatus.lyric === 'success' ? 'checkbox-marked' : (task.metadataStatus.lyric === 'fail' ? 'close' : 'checkbox-blank-outline')} color={task.metadataStatus.lyric === 'success' ? theme['c-primary'] : (task.metadataStatus.lyric === 'fail' ? errorColor : theme['c-font-label'])} size={12} />
        <Text size={10} color={theme['c-font-label']}>歌词</Text>
      </View>
      {!selecting && !task.isRemoteSynced && canRetryMetadata && hasMetaError && task.status === 'completed' && (
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Icon name="available_updates" size={14} color={theme['c-primary-font-active']} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.7}
      onLongPress={() => { if (!selecting) onSelect(task.id); }}
      onPress={() => { if (selecting) onSelect(task.id); }}
      accessibilityRole={selecting ? 'checkbox' : 'button'} accessibilityState={{ checked: selected }}>
      {selecting && <Icon name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={theme['c-primary']} />}
      <Image url={task.musicInfo.meta.picUrl} style={styles.artwork} />
      <View style={styles.info}>
        <Text numberOfLines={1}>
          {task.musicInfo.name}
          <Text size={12} color={theme['c-font-label']}>  {task.musicInfo.singer}</Text>
        </Text>
        <View style={styles.detailsRow}>
          <Text size={11} color={theme['c-font-label']}>{task.quality.toUpperCase()}</Text>
          {task.target === 'onedrive' &&
            <Text size={11} color={theme['c-font-label']}> • OneDrive</Text>
          }
          {task.status === 'completed' && task.progress.total > 0 &&
            <Text size={11} color={theme['c-font-label']}> • {sizeFormate(task.progress.total)}</Text>
          }
          <Text size={11} color={theme['c-font-label']}> • {dateFormat(task.createdAt, 'Y-M-D h:m')}</Text>
        </View>
        {renderStatus()}
        {task.status === 'completed' && renderMetadataStatus()}
      </View>
      {!selecting && <View style={styles.actionsContainer}>
        { !task.isRemoteSynced && task.status === 'paused' && (
          <TouchableOpacity onPress={handleResume} style={styles.actionButton}>
            <Icon name="play-outline" size={18} color={theme['c-primary']} />
          </TouchableOpacity>
        ) }
        { !task.isRemoteSynced && (task.status === 'error' || (canRetryMetadata && task.status === 'completed' && hasMetaError)) && (
          <TouchableOpacity onPress={handleRetry} style={styles.actionButton}>
            <Icon name="available_updates" size={18} color={theme['c-primary']} />
          </TouchableOpacity>
        ) }
        <TouchableOpacity onPress={() => onRemove(task.id)} style={styles.actionButton}>
          <Icon name="close" size={16} color={theme['c-font-label']} />
        </TouchableOpacity>
      </View>}
    </TouchableOpacity>
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
