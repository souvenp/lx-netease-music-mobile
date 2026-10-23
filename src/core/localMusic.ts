import { readDir, type FileType } from '@/utils/fs'
import { readMetadata, readPic } from '@/utils/localMediaMetadata'
import { formatPlayTime2 } from '@/utils'

export interface LocalMusicEntry {
  musicInfo: LX.Music.MusicInfoLocal
  modifiedAt: number
  // 本地文件的实际码率，单位 kbps；未知时不推断高音质。
  bitrate: number
}

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
): Promise<{ entries: LocalMusicEntry[], errors: string[] }> => {
  const pending = [...new Set(paths.map(normalizeLocalPath))]
  const visited = new Set<string>()
  const files = new Map<string, FileType>()
  const errors: string[] = []
  // 父目录和子目录同时添加时，目录和文件分别去重。
  while (pending.length && !isCancelled()) {
    const path = pending.shift()!
    if (visited.has(path)) continue
    visited.add(path)
    try {
      for (const file of await readDir(path)) {
        if (file.isDirectory) pending.push(normalizeLocalPath(file.path))
        else if (isAudioFile(file) && !excludedPaths.has(normalizeLocalPath(file.path))) files.set(normalizeLocalPath(file.path), file)
      }
    } catch {
      errors.push(path)
    }
  }

  const entries: LocalMusicEntry[] = []
  const sortedFiles = [...files.values()].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0) || a.path.localeCompare(b.path))
  // 限制元信息读取并发；无标签或标签损坏时仍以文件名展示。
  for (let index = 0; index < sortedFiles.length && !isCancelled(); index += 8) {
    entries.push(...await Promise.all(sortedFiles.slice(index, index + 8).map(async file => {
      // 封面读取独立容错，没有内嵌封面时仍显示歌曲和默认封面。
      const [metadata, picUrl] = await Promise.all([
        readMetadata(file.path).catch(() => null),
        readPic(file.path).catch(() => ''),
      ])
      return {
        modifiedAt: file.lastModified || 0,
        bitrate: Number(metadata?.bitrate) || 0,
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
  return { entries, errors }
}
