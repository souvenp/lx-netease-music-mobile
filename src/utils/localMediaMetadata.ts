import {temporaryDirectoryPath, readDir, unlink, extname, privateStorageDirectoryPath} from '@/utils/fs'
import { readPic as _readPic } from 'react-native-local-media-metadata'
export {
  type MusicMetadata,
  type MusicMetadataFull,
  readMetadata,
  writeMetadata,
  writePic,
  readLyric,
  writeLyric,
} from 'react-native-local-media-metadata'

let cleared = false
const picCachePath = privateStorageDirectoryPath + '/local-media-covers';

export const scanAudioFiles = async (dirPath: string) => {
  const files = await readDir(dirPath)
  return files
    .filter((file) => {
      if (file.mimeType?.startsWith('audio/')) return true
      if (extname(file?.name ?? '') === 'ogg') return true
      return false
    })
    .map((file) => file)
}

const clearPicCache = async () => {
  await unlink(picCachePath)
  cleared = true
}

export const readPic = async (filePath: string): Promise<string> => {
  const processedPath = filePath.includes('#')
    ? filePath.replace(/#/g, '%23')
    : filePath;
  let path = await _readPic(processedPath, picCachePath);

  if (path && !path.startsWith('file://') && path.startsWith('/')) {
    path = `file://${path}`;
  }
  return path;
}
