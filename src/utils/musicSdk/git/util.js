import { aesEncryptSync, aesDecryptSync, AES_MODE } from '@/utils/nativeModules/crypto'
import { toMD5 } from '../utils'
import { httpFetch } from '../../request'
import { formatPlayTime } from '@/utils/common'

// 音乐数据库缓存
let musicDatabase = null
let lastFetchTime = 0
const CACHE_DURATION = 3600000 // 1小时缓存

// Gitcode配置
export const GITCODE_CONFIG = {
  owner: '', // Gitcode用户名
  repo: '', // 仓库名
  token: '', // 访问令牌
  dbUrl: null, // 数据库文件URL（将在init中设置）
}
GITCODE_CONFIG.dbUrl = `https://api.gitcode.com/api/v5/repos/${GITCODE_CONFIG.owner}/${GITCODE_CONFIG.repo}/raw/audio_database.json?access_token=${GITCODE_CONFIG.token}`

/**
 * 加载音乐数据库
 */
export const loadDatabase = async (forceReload = false) => {
  const now = Date.now()

  // 检查缓存是否有效
  if (!forceReload && musicDatabase && now - lastFetchTime < CACHE_DURATION) {
    return musicDatabase
  }

  try {
    const requestObj = httpFetch(GITCODE_CONFIG.dbUrl)
    const { body } = await requestObj.promise

    if (typeof body === 'string') {
      musicDatabase = JSON.parse(body)
    } else {
      musicDatabase = body
    }

    lastFetchTime = now
    console.log(`成功加载 ${musicDatabase.length} 首歌曲`)
    return musicDatabase
  } catch (error) {
    console.error('加载数据库失败:', error)
    return []
  }
}

/**
 * 从文件名提取歌曲名
 */
export const extractNameFromFile = (filename) => {
  if (!filename) return '未知歌曲'
  // 移除扩展名
  let name = filename.replace(/\.[^.]+$/, '')
  // 尝试提取歌曲名（处理常见格式：歌手 - 歌名）
  const match = name.match(/^(?:.*?[-–—]\s*)?(.+)$/)
  return match ? match[1].trim() : name
}

/**
 * 生成歌曲ID
 */
export const generateSongId = (relativePath) => {
  // 使用相对路径的哈希作为唯一ID
  const hash = simpleHash(relativePath)
  return `gitcode_${hash}`
}

/**
 * 生成专辑ID
 */
export const generateAlbumId = (album) => {
  if (!album) return ''
  return `album_${simpleHash(album)}`
}

/**
 * 简单哈希函数
 */
export const simpleHash = (str) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // 转换为32位整数
  }
  return Math.abs(hash).toString(36)
}

/**
 * 获取歌曲时长
 */
export const getInterval = (item) => {
  // 如果元数据中有时长信息，使用它
  if (item.duration) {
    return formatPlayTime(item.duration)
  }
  // 否则返回默认值
  return '00:00'
}

/**
 * 获取音质类型
 */
export const getTypes = (item) => {
  const types = []
  const format = item.format?.toLowerCase()

  // 根据格式判断音质
  if (format === 'flac') {
    types.push({ type: 'flac', size: formatSize(item.filesize) })
  } else if (format === 'mp3') {
    types.push({ type: '320k', size: formatSize(item.filesize) })
  } else if (format === 'm4a' || format === 'mp4') {
    types.push({ type: '128k', size: formatSize(item.filesize) })
  } else {
    types.push({ type: '128k', size: formatSize(item.filesize) })
  }

  return types
}

/**
 * 获取音质类型（详细版）
 */
export const get_Types = (item) => {
  const _types = {}
  const format = item.format?.toLowerCase()

  if (format === 'flac') {
    _types.flac = { size: formatSize(item.filesize) }
  } else if (format === 'mp3') {
    _types['320k'] = { size: formatSize(item.filesize) }
  } else {
    _types['128k'] = { size: formatSize(item.filesize) }
  }

  return _types
}

/**
 * 格式化文件大小
 */
export const formatSize = (bytes) => {
  if (!bytes) return 'UNKNOWN'
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + sizes[i]
}

export const objStr2JSON = (str) => {
  return JSON.parse(
    str.replace(/('(?=(,\s*')))|('(?=:))|((?<=([:,]\s*))')|((?<={)')|('(?=}))/g, '"')
  )
}

export const formatSinger = (rawData) => rawData.replace(/&/g, '、')

export const matchToken = (headers) => {
  try {
    return headers['set-cookie'].match(/kw_token=(\w+)/)[1]
  } catch (err) {
    return null
  }
}

export const lrcTools = {
  rxps: {
    wordLine: /^(\[\d{1,2}:.*\d{1,4}\])\s*(\S+(?:\s+\S+)*)?\s*/,
    tagLine: /\[(ver|ti|ar|al|offset|by|kuwo):\s*(\S+(?:\s+\S+)*)\s*\]/,
    wordTimeAll: /<(-?\d+),(-?\d+)(?:,-?\d+)?>/g,
    wordTime: /<(-?\d+),(-?\d+)(?:,-?\d+)?>/,
  },
  offset: 1,
  offset2: 1,
  isOK: false,
  lines: [],
  tags: [],
  getWordInfo(str, str2, prevWord) {
    const offset = parseInt(str)
    const offset2 = parseInt(str2)
    let startTime = Math.abs((offset + offset2) / (this.offset * 2))
    let endTime = Math.abs((offset - offset2) / (this.offset2 * 2)) + startTime
    if (prevWord) {
      if (startTime < prevWord.endTime) {
        prevWord.endTime = startTime
        if (prevWord.startTime > prevWord.endTime) {
          prevWord.startTime = prevWord.endTime
        }

        prevWord.newTimeStr = `<${prevWord.startTime},${prevWord.endTime - prevWord.startTime}>`
        // console.log(prevWord)
      }
    }
    return {
      startTime,
      endTime,
      timeStr: `<${startTime},${endTime - startTime}>`,
    }
  },
  parseLine(line) {
    if (line.length < 6) return
    let result = this.rxps.wordLine.exec(line)
    if (result) {
      const time = result[1]
      let words = result[2]
      if (words == null) {
        words = ''
      }
      const wordTimes = words.match(this.rxps.wordTimeAll)
      if (!wordTimes) return
      // console.log(wordTimes)
      let preTimeInfo
      for (const timeStr of wordTimes) {
        const result = this.rxps.wordTime.exec(timeStr)
        const wordInfo = this.getWordInfo(result[1], result[2], preTimeInfo)
        words = words.replace(timeStr, wordInfo.timeStr)
        if (preTimeInfo?.newTimeStr)
          words = words.replace(preTimeInfo.timeStr, preTimeInfo.newTimeStr)
        preTimeInfo = wordInfo
      }
      this.lines.push(time + words)
      return
    }
    result = this.rxps.tagLine.exec(line)
    if (!result) return
    if (result[1] == 'kuwo') {
      let content = result[2]
      if (content != null && content.includes('][')) {
        content = content.substring(0, content.indexOf(']['))
      }
      const valueOf = parseInt(content, 8)
      this.offset = Math.trunc(valueOf / 10)
      this.offset2 = Math.trunc(valueOf % 10)
      if (
        this.offset == 0 ||
        Number.isNaN(this.offset) ||
        this.offset2 == 0 ||
        Number.isNaN(this.offset2)
      ) {
        this.isOK = false
      }
    } else {
      this.tags.push(line)
    }
  },
  parse(lrc) {
    // console.log(lrc)
    const lines = lrc.split(/\r\n|\r|\n/)
    const tools = Object.create(this)
    tools.isOK = true
    tools.offset = 1
    tools.offset2 = 1
    tools.lines = []
    tools.tags = []

    for (const line of lines) {
      if (!tools.isOK) throw new Error('failed')
      tools.parseLine(line)
    }
    if (!tools.lines.length) return ''
    let lrcs = tools.lines.join('\n')
    if (tools.tags.length) lrcs = `${tools.tags.join('\n')}\n${lrcs}`
    // console.log(lrcs)
    return lrcs
  },
}

export const wbdCrypto = {
  aesMode: 'aes-128-ecb',
  aesKey: 'cFcnPcf6Kb85RC1y3V6M5A==',
  aesIv: '',
  appId: 'y67sprxhhpws',
  decodeData(base64Result) {
    const data = decodeURIComponent(base64Result)
    return JSON.parse(aesDecryptSync(data, this.aesKey, this.aesIv, AES_MODE.ECB_128_NoPadding))
  },
  createSign(data, time) {
    const str = `${this.appId}${data}${time}`
    return toMD5(str).toUpperCase()
  },
  buildParam(jsonData) {
    const data = Buffer.from(JSON.stringify(jsonData)).toString('base64')
    const time = Date.now()

    const encodeData = aesEncryptSync(data, this.aesKey, this.aesIv, AES_MODE.ECB_128_NoPadding)
    const sign = this.createSign(encodeData, time)

    return `data=${encodeURIComponent(encodeData)}&time=${time}&appId=${this.appId}&sign=${sign}`
  },
}

/**
 * 构建下载URL
 */
export const buildDownloadUrl = (relativePath) => {
  const encodedPath = encodeURIComponent(relativePath.replace(/\\/g, '/'))
  return `https://api.gitcode.com/api/v5/repos/${GITCODE_CONFIG.owner}/${GITCODE_CONFIG.repo}/raw/${encodedPath}?access_token=${GITCODE_CONFIG.token}`
}
