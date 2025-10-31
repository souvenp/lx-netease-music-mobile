import { saveData, getData } from '@/plugins/storage';
import { storageDataPrefix } from '@/config/constant';

// 定义一个操作可以是任何一种列表事件
export type ListOperation = LX.Sync.List.ActionList;

let operationQueue: ListOperation[] = [];
const STORAGE_KEY = storageDataPrefix.sync + 'op_queue_v2'; // 使用新key以避免旧数据干扰

/**
 * 加载本地未同步的操作队列
 */
export async function loadOperationQueue(): Promise<void> {
  const storedQueue = await getData<ListOperation[]>(STORAGE_KEY);
  operationQueue = storedQueue || [];
  console.log('[Sync OpQueue] Loaded operations:', operationQueue.length);
}

/**
 * 记录一个新的操作到队列
 * @param operation 具体的操作对象
 */
export async function logOperation(operation: ListOperation): Promise<void> {
  operationQueue.push(operation);
  await saveData(STORAGE_KEY, operationQueue);
}

/**
 * 获取当前所有的操作队列
 */
export function getOperationQueue(): ListOperation[] {
  return [...operationQueue];
}

/**
 * 清空操作队列
 */
export async function clearOperationQueue(): Promise<void> {
  operationQueue = [];
  await saveData(STORAGE_KEY, []);
}
