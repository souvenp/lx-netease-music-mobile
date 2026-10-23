import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, BackHandler, ScrollView, TouchableOpacity } from 'react-native';
import PageContent from '@/components/PageContent';
import Header from './Header';
import ListItem from './ListItem';
import { useDownloadTasks } from '@/store/download/hook';
import { confirmDialog, createStyle, toast } from '@/utils/tools';
import { setComponentId } from '@/core/common';
import { removeTask, resumeTask, retryTask } from '@/core/download';
import Text from '@/components/common/Text';
import Button from '@/screens/Home/Views/Setting/components/Button';
import { isFailedTask, matchesTaskFilter, type TaskFilter } from './taskFilters';
import { useTheme } from '@/store/theme/hook';

// 状态按钮同时展示数量，帮助定位大量任务。
const filters: Array<{ id: TaskFilter, label: string }> = [
  { id: 'all', label: '全部' }, { id: 'downloading', label: '下载中' },
  { id: 'pending', label: '待处理' }, { id: 'error', label: '失败' }, { id: 'completed', label: '已完成' },
];

export default memo(({ componentId }: { componentId: string }) => {
  useEffect(() => {
    setComponentId('DOWNLOAD_MANAGER', componentId);
  }, [componentId]);

  const tasks = useDownloadTasks();
  // 紧凑筛选项使用主题色标记当前类别。
  const theme = useTheme();

  // 多选仅作用于当前筛选，切换类别时清空，避免误操作隐藏项。
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 没有勾选项时自动退出多选，无需额外的进出按钮。
  const selecting = selected.size > 0;
  const visibleTasks = useMemo(() => tasks.filter(task => matchesTaskFilter(task, filter)), [tasks, filter]);
  const selectedTasks = visibleTasks.filter(task => selected.has(task.id));
  const failedTasks = tasks.filter(task => !task.isRemoteSynced && isFailedTask(task));

  // 状态变化后移出分类的任务不继续保留勾选。
  useEffect(() => {
    setSelected(previous => {
      const visibleIds = new Set(visibleTasks.map(task => task.id));
      const next = new Set([...previous].filter(id => visibleIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [visibleTasks]);

  // 返回键先退出多选，保持用户当前浏览位置。
  useEffect(() => {
    if (!selecting) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelected(new Set());
      return true;
    });
    return () => subscription.remove();
  }, [selecting]);

  // 长按进入多选；后续点击切换勾选状态。
  const toggleSelection = useCallback((id: string) => {
    setSelected(previous => {
      const next = new Set(previous); // 不修改旧集合，保证列表刷新。
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // 批量恢复仅处理失败或中断项，跳过其他设备同步的记录。
  const retryTasks = (items: LX.Download.DownloadTask[]) => {
    const retryable = items.filter(task => !task.isRemoteSynced && (isFailedTask(task) || task.status === 'paused'));
    for (const task of retryable) {
      if (task.status === 'paused') void resumeTask(task.id);
      else retryTask(task.id);
    }
    toast(`已提交 ${retryable.length} 个任务重试`);
    setSelected(new Set());
  };

  // 删除任务记录前提示未完成文件的清理行为，完成的音乐文件保留。
  const removeSelected = async () => {
    const ids = selectedTasks.map(task => task.id); // 固定本次确认的任务范围。
    if (!ids.length || !await confirmDialog({ message: `移除所选 ${ids.length} 个任务？未完成的临时文件会清理，已完成的音乐文件保留。` })) return;
    ids.forEach(removeTask);
    setSelected(new Set());
  };

  const handleRemove = useCallback((id: string) => {
    removeTask(id);
  }, []);

  return (
    <PageContent>
      <View style={styles.container}>
        <Header componentId={componentId} onBack={selecting ? () => setSelected(new Set()) : undefined} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
          {filters.map(item => <TouchableOpacity key={item.id}
            accessibilityRole="tab" accessibilityState={{ selected: filter === item.id }}
            style={{ ...styles.filter, backgroundColor: filter === item.id ? theme['c-primary-background-active'] : theme['c-button-background'] }}
            onPress={() => {
              setFilter(item.id);
              setSelected(new Set());
            }}><Text size={12} numberOfLines={1} color={filter === item.id ? theme['c-primary-font'] : theme['c-button-font']}>
              {item.label} {tasks.filter(task => matchesTaskFilter(task, item.id)).length}
            </Text></TouchableOpacity>)}
        </ScrollView>
        <View style={styles.toolbar}>
          {selecting ? <>
            <Text>已选 {selectedTasks.length}</Text>
            <Button onPress={() => setSelected(selectedTasks.length === visibleTasks.length ? new Set() : new Set(visibleTasks.map(task => task.id)))}>全选/取消</Button>
            <Button disabled={!selectedTasks.some(task => !task.isRemoteSynced && (isFailedTask(task) || task.status === 'paused'))} onPress={() => retryTasks(selectedTasks)}>重试/继续</Button>
            <Button disabled={!selectedTasks.length} onPress={() => { void removeSelected(); }}>移除任务</Button>
          </> : <>
            <Button disabled={!failedTasks.length} onPress={() => retryTasks(failedTasks)}>一键重试失败 ({failedTasks.length})</Button>
          </>}
        </View>
        <FlatList
          data={visibleTasks}
          extraData={selected}
          ListEmptyComponent={<Text style={styles.empty}>当前分类暂无下载任务</Text>}
          renderItem={({ item }) => (
            <ListItem
              task={item}
              onRemove={handleRemove}
              selecting={selecting}
              selected={selected.has(item.id)}
              onSelect={toggleSelection}
            />
          )}
          keyExtractor={item => item.id}
        />
      </View>
    </PageContent>
  );
});

const styles = createStyle({
  // 筛选保持单行；大字号或数量较多时允许横向滑动，不挤成两行。
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  filter: { paddingHorizontal: 7, paddingVertical: 9, borderRadius: 4 },
  // 工具栏自动换行，适应窄屏和大字体。
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 10 },
  empty: { padding: 24, textAlign: 'center' },
  container: {
    flex: 1,
  },
});
