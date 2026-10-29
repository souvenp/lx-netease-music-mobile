import RNFetchBlob from 'rn-fetch-blob'
import { createClient } from 'webdav'
import settingState from '@/store/setting/state'
import { getWebDAVConnection } from '@/utils/webdav'

// 统一远程目录格式，并校验路径分段。
export const normalizeWebDAVDirectory = (value: string) => {
  const parts = (value.trim() || '/Music').split('/').filter(Boolean)
  if (parts.some(part => part === '.' || part === '..' || /[\\\u0000-\u001f]/.test(part))) {
    throw new Error('WebDAV 音乐目录格式不正确')
  }
  return '/' + parts.join('/')
}

// 任务保存目标位置，密码在上传时读取。
export const getWebDAVDownloadDestination = () => {
  const { url, username } = getWebDAVConnection()
  return { url, username, directory: normalizeWebDAVDirectory(settingState.setting['download.webdavPath']) }
}

// 固定任务目标，重试时使用最新密码。
export const createWebDAVUploader = (destination: NonNullable<LX.Download.DownloadTask['webdavDestination']>) => {
  const { url, username, password } = getWebDAVConnection()
  if (url !== destination.url || username !== destination.username) {
    throw new Error('WebDAV 连接已变更，请恢复任务原来的服务器和用户名后重试')
  }
  const directory = normalizeWebDAVDirectory(destination.directory)
  const client = createClient(url, { username, password })

  return async ({ localPath, fileName, isCancelled, onRequest, onProgress }: {
    localPath: string
    fileName: string
    isCancelled: () => boolean
    onRequest: (request: ReturnType<typeof RNFetchBlob.fetch>) => void
    onProgress: (uploaded: number, total: number) => void
  }) => {
    if (!fileName || fileName === '.' || fileName === '..' || /[/\\\u0000-\u001f]/.test(fileName)) throw new Error('上传文件名不正确')
    if (isCancelled()) throw new Error('任务已移除')
    let current = ''
    for (const part of directory.split('/').filter(Boolean)) {
      current += '/' + part
      if (!await client.exists(current)) {
        try { await client.createDirectory(current) } catch (error) {
          if (!await client.exists(current)) throw error
        }
      }
      if (isCancelled()) throw new Error('任务已移除')
    }
    const file = await RNFetchBlob.fs.stat(localPath)
    if (isCancelled()) throw new Error('任务已移除')
    const remotePath = `${directory === '/' ? '' : directory}/${fileName}`
    const uploadUrl = url + remotePath.split('/').map(encodeURIComponent).join('/')
    const request = RNFetchBlob.config({ followRedirect: false, timeout: 60000 }).fetch('PUT', uploadUrl, {
      ...client.getHeaders(),
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(file.size),
      'If-None-Match': '*', // 同名文件由服务器返回冲突。
    }, RNFetchBlob.wrap(localPath))
    onRequest(request)
    request.uploadProgress({ interval: 500 }, (written, total) => onProgress(Number(written), Number(total)))
    const response = await request
    const status = response.info().status
    if (status === 412) {
      const verificationPath = `${localPath}.webdav-check`
      try {
        if (isCancelled()) throw new Error('任务已移除')
        const verification = RNFetchBlob.config({ path: verificationPath, followRedirect: false, timeout: 60000 })
          .fetch('GET', uploadUrl, { ...client.getHeaders(), 'Cache-Control': 'no-cache' })
        onRequest(verification)
        const remote = await verification
        if (isCancelled()) throw new Error('任务已移除')
        if (remote.info().status !== 200) throw new Error(`核验失败：HTTP ${remote.info().status}`)
        const remoteFile = await RNFetchBlob.fs.stat(verificationPath)
        if (Number(remoteFile.size) !== Number(file.size)) throw new Error('文件大小不一致')
        // 同名和大小不足以确认上传结果，比较完整文件摘要。
        const [localHash, remoteHash] = await Promise.all([
          RNFetchBlob.fs.hash(localPath, 'sha256'),
          RNFetchBlob.fs.hash(verificationPath, 'sha256'),
        ])
        if (isCancelled()) throw new Error('任务已移除')
        if (!/^[a-f0-9]{64}$/i.test(localHash) || localHash.toLowerCase() !== remoteHash.toLowerCase()) {
          throw new Error('文件内容不一致')
        }
      } catch (error) {
        throw new Error(`WebDAV 已存在同名文件：${fileName}；${error instanceof Error ? error.message : '核验失败'}，请重试或检查远端文件`)
      } finally {
        await RNFetchBlob.fs.unlink(verificationPath).catch(() => {})
      }
    } else if (status < 200 || status >= 300) throw new Error(`WebDAV 上传失败：HTTP ${status}`)
    return { remotePath, size: Number(file.size) }
  }
}
