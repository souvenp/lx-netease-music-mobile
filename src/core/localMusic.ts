import { readDir, type FileType } from '@/utils/fs'
import { readMetadata, readPic } from '@/utils/localMediaMetadata'
import { formatPlayTime2 } from '@/utils'

export interface LocalMusicEntry {
  musicInfo: LX.Music.MusicInfoLocal
  modifiedAt: number
  // 本地文件的实际码率，单位 kbps；未知时不推断高音质。
  bitrate: number
  // 文件属性和媒体索引用于增量比较，目录来源用于读取失败时保留旧条目。
  size?: number
  mediaSignature?: string
  rootPath?: string
  metadataFailed?: boolean
}

// 内存快照与磁盘快照共用结构；手动扫描始终重读标签和封面。
export interface LocalMusicSnapshot {
  key: string
  paths: string[]
  entries: LocalMusicEntry[]
  errors: string[]
  mediaIndex: Record<string, string> | null
  checkedAt: number
}
export const localMusicCache: LocalMusicSnapshot = {
  key: '', paths: [], entries: [], errors: [], mediaIndex: null, checkedAt: 0,
}

// 目录和本机下载文件变化才使缓存失效，远程记录和下载进度不触发全盘扫描。
export const getLocalMusicScanKey = (paths: string[], tasks: LX.Download.DownloadTask[]) => JSON.stringify([
  paths,
  tasks.filter(task => !task.isRemoteSynced && (task.target ?? 'local') === 'local')
    .map(task => [normalizeLocalPath(task.filePath), task.status === 'completed']).sort(),
])

// 保留 URI 原样；普通路径统一末尾分隔符，避免重复扫描同一目录。
export const normalizeLocalPath = (path: string) => path.startsWith('content://') ? path : path.replace(/\/+$/, '') || '/'

export const parseLocalPaths = (value: string): string[] => {
  try {
    const paths: unknown = JSON.parse(value)
    return Array.isArray(paths) ? [...new Set(paths.filter((path): path is string => typeof path === 'string' && !!path.trim()).map(normalizeLocalPath))] : []
  } catch {
    return []
  }
}

const isAudioFile = (file: FileType) => file.isFile && (
  file.mimeType?.startsWith('audio/') || /\.(mp3|flac|m4a|aac|ogg|opus|wav|wma|ape|aiff|aif|alac)$/i.test(file.name)
)

export const scanLocalMusic = async (
  paths: string[],
  excludedPaths: Set<string>,
  isCancelled: () => boolean = () => false,
  // 自动检查复用未变化文件；显式刷新可以强制重读所有元信息。
  options: { previousEntries?: LocalMusicEntry[], mediaIndex?: Record<string, string> | null, force?: boolean } = {},
): Promise<{ entries: LocalMusicEntry[], errors: string[] }> => {
  // 保留扫描根目录，SAF 子文档 URI 不一定包含父目录 URI。
  const pending = [...new Set(paths.map(normalizeLocalPath))].map(path => ({ path, rootPath: path }))
  const visited = new Set<string>()
  const files = new Map<string, { file: FileType, rootPath: string }>()
  const errors: string[] = []
  // 读取失败的目录保留旧缓存，避免权限故障被误判为删除全部音乐。
  const failedRoots = new Set<string>()
  const previous = new Map((options.previousEntries ?? []).map(entry => [normalizeLocalPath(entry.musicInfo.meta.filePath), entry]))
  // 父目录和子目录同时添加时，目录和文件分别去重。
  while (pending.length && !isCancelled()) {
    const { path, rootPath } = pending.shift()!
    if (visited.has(path)) continue
    visited.add(path)
    try {
      for (const file of await readDir(path)) {
        if (file.isDirectory) pending.push({ path: normalizeLocalPath(file.path), rootPath })
        else if (isAudioFile(file) && !excludedPaths.has(normalizeLocalPath(file.path))) files.set(normalizeLocalPath(file.path), { file, rootPath })
      }
    } catch {
      errors.push(path)
      failedRoots.add(rootPath)
    }
  }

  const entries: LocalMusicEntry[] = []
  const sortedFiles = [...files.values()].sort((a, b) => (b.file.lastModified || 0) - (a.file.lastModified || 0) || a.file.path.localeCompare(b.file.path))
  // 限制元信息读取并发；无标签或标签损坏时仍以文件名展示。
  for (let index = 0; index < sortedFiles.length && !isCancelled(); index += 8) {
    entries.push(...await Promise.all(sortedFiles.slice(index, index + 8).map(async ({ file, rootPath }) => {
      // 属性可信且索引未变时，复用歌曲信息及已提取封面，避免逐首打开文件。
      const cached = previous.get(normalizeLocalPath(file.path))
      const mediaSignature = options.mediaIndex == null ? cached?.mediaSignature : options.mediaIndex[normalizeLocalPath(file.path)]
      if (!options.force && cached && !cached.metadataFailed && file.lastModified > 0 &&
        Number.isFinite(file.size) && cached.modifiedAt === file.lastModified && cached.size === file.size &&
        cached.mediaSignature === mediaSignature) return { ...cached, rootPath }
      // 封面读取独立容错，没有内嵌封面时仍显示歌曲和默认封面。
      const [metadata, picUrl] = await Promise.all([
        readMetadata(file.path).catch(() => null),
        readPic(file.path).catch(() => ''),
      ])
      return {
        modifiedAt: file.lastModified || 0,
        bitrate: Number(metadata?.bitrate) || 0,
        size: file.size,
        rootPath,
        mediaSignature,
        metadataFailed: !metadata,
        musicInfo: {
          id: file.path,
          name: metadata?.name || file.name.replace(/\.[^.]+$/, ''),
          singer: metadata?.singer || '',
          source: 'local' as const,
          interval: metadata?.interval ? formatPlayTime2(metadata.interval) : null,
          meta: {
            albumName: metadata?.albumName || '', filePath: file.path, songId: file.path,
            picUrl, ext: metadata?.ext || file.name.split('.').pop() || '',
          },
        },
      }
    })))
  }
  // 仅在目录枚举成功时确认删除；失败目录的旧条目保留并显示错误提示。
  for (const [path, cached] of previous) {
    if (!files.has(path) && !excludedPaths.has(path) && cached.rootPath && failedRoots.has(cached.rootPath)) entries.push(cached)
  }
  entries.sort((a, b) => b.modifiedAt - a.modifiedAt || a.musicInfo.id.localeCompare(b.musicInfo.id))
  return { entries, errors }
}
