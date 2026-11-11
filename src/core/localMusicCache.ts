import { getData, saveData } from '@/plugins/storage'
import { getLocalAudioIndex } from '@/utils/nativeModules/localMedia'
import { getLocalMusicScanKey, localMusicCache, normalizeLocalPath, scanLocalMusic, type LocalMusicSnapshot } from './localMusic'

// 独立版本键用于校验磁盘结构；定期补查系统尚未收录或忽略的文件。
const CACHE_KEY = '@local_music_snapshot_v1'
const DIRECTORY_CHECK_INTERVAL = 6 * 60 * 60 * 1000
let restorePromise: Promise<void> | null = null
let writeQueue = Promise.resolve()

// 对磁盘缓存做结构检查，损坏时回退扫描，不影响页面进入。
const isSnapshot = (value: unknown): value is LocalMusicSnapshot => {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as LocalMusicSnapshot
  return typeof snapshot.key === 'string' && Number.isFinite(snapshot.checkedAt) &&
    Array.isArray(snapshot.paths) && snapshot.paths.every(path => typeof path === 'string') &&
    Array.isArray(snapshot.errors) && snapshot.errors.every(path => typeof path === 'string') &&
    (snapshot.mediaIndex === null || (!!snapshot.mediaIndex && typeof snapshot.mediaIndex === 'object' &&
      !Array.isArray(snapshot.mediaIndex) && Object.values(snapshot.mediaIndex).every(value => typeof value === 'string'))) &&
    Array.isArray(snapshot.entries) && snapshot.entries.every(entry => entry && Number.isFinite(entry.modifiedAt) &&
      Number.isFinite(entry.bitrate) && typeof entry.musicInfo?.id === 'string' &&
      typeof entry.musicInfo.name === 'string' && typeof entry.musicInfo.singer === 'string' &&
      entry.musicInfo.source === 'local' && typeof entry.musicInfo.meta?.filePath === 'string' &&
      typeof entry.musicInfo.meta.ext === 'string')
}

// 先从持久化存储恢复内存缓存，整个进程只读取一次，且不覆盖已完成的新扫描。
export const restoreLocalMusicCache = (): Promise<void> => {
  restorePromise ??= getData(CACHE_KEY).then(snapshot => {
    if (!localMusicCache.key && isSnapshot(snapshot)) Object.assign(localMusicCache, snapshot)
  }).catch(() => {})
  return restorePromise
}

// 只展示当前目录集合的缓存，并排除正在写入的未完成下载文件。
export const getCachedLocalMusic = (paths: string[], tasks: LX.Download.DownloadTask[]) => {
  if (JSON.stringify(localMusicCache.paths) !== JSON.stringify(paths)) return null
  const excluded = getExcludedPaths(tasks)
  return { entries: localMusicCache.entries.filter(entry => !excluded.has(normalizeLocalPath(entry.musicInfo.meta.filePath))), errors: localMusicCache.errors }
}

// 尚未完成的本机下载不应作为可播放音乐；远端记录不参与本地过滤。
const getExcludedPaths = (tasks: LX.Download.DownloadTask[]) => new Set(tasks
  .filter(task => !task.isRemoteSynced && (task.target ?? 'local') === 'local' && task.status !== 'completed')
  .map(task => normalizeLocalPath(task.filePath)))

// 比较全部路径能同时发现新增、修改和删除，不能只比较最大修改时间。
const sameMediaIndex = (left: Record<string, string> | null, right: Record<string, string> | null) =>
  left !== null && right !== null && Object.keys(left).length === Object.keys(right).length &&
  Object.keys(left).every(path => left[path] === right[path])

// 后台检查索引变化；必要时才枚举目录，并只重读新增或变化歌曲的标签与封面。
export const refreshLocalMusicCache = async (
  paths: string[], tasks: LX.Download.DownloadTask[], force: boolean, isCancelled: () => boolean,
) => {
  await restoreLocalMusicCache()
  // 页面已离开时停止后续原生查询，避免快速切换页面积累后台工作。
  if (isCancelled()) return null
  // 查询失败使用目录检查兜底，不把空索引当作所有文件都被删除。
  const mediaIndex = await getLocalAudioIndex(paths)
  if (isCancelled()) return null
  const key = getLocalMusicScanKey(paths, tasks)
  const now = Date.now()
  const unchanged = localMusicCache.key === key && sameMediaIndex(localMusicCache.mediaIndex, mediaIndex)
  // SAF、未收录文件、失败目录及无可靠属性的条目都需要文件系统兜底。
  const needsDirectoryCheck = paths.some(path => path.startsWith('content://')) || localMusicCache.errors.length > 0 ||
    localMusicCache.entries.some(entry => !mediaIndex?.[normalizeLocalPath(entry.musicInfo.meta.filePath)] ||
      entry.metadataFailed || !entry.modifiedAt || !Number.isFinite(entry.size)) ||
    now < localMusicCache.checkedAt || now - localMusicCache.checkedAt >= DIRECTORY_CHECK_INTERVAL
  if (!force && unchanged && !needsDirectoryCheck) return getCachedLocalMusic(paths, tasks)
  const result = await scanLocalMusic(paths, getExcludedPaths(tasks), isCancelled, {
    previousEntries: localMusicCache.entries, mediaIndex, force,
  })
  if (isCancelled()) return null
  // 即使持久化失败也保留内存结果；串行写入防止较旧快照最后落盘。
  const snapshot: LocalMusicSnapshot = { ...result, key, paths: [...paths], mediaIndex, checkedAt: now }
  Object.assign(localMusicCache, snapshot)
  writeQueue = writeQueue.catch(() => {}).then(() => saveData(CACHE_KEY, snapshot))
  await writeQueue.catch(() => { console.warn('本地音乐缓存保存失败，下次启动将重新检查') })
  return result
}
