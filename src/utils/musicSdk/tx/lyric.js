import { httpFetch } from '../../request'
import getMusicInfo from './musicInfo'
import { decodeQrc } from './qrcDecode'

const songIdMap = new Map()
const promises = new Map()
export const decodeLyric = async(lrc, tlrc, rlrc) => ({
  lyric: await decodeQrc(lrc),
  tlyric: await decodeQrc(tlrc),
  rlyric: await decodeQrc(rlrc),
})


const parseTools = {
  rxps: {
    info: /^{"/,
    lineTime: /^\[(\d+),\d+\]/,
    lineTime2: /^\[([\d:.]+)\]/,
    wordTime: /\(\d+,\d+\)/,
    wordTimeAll: /(\(\d+,\d+\))/g,
    timeLabelFixRxp: /(?:\.0+|0+)$/,
  },
  msFormat(timeMs) {
    if (Number.isNaN(timeMs)) return ''
    let ms = timeMs % 1000
    timeMs /= 1000
    let m = parseInt(timeMs / 60).toString().padStart(2, '0')
    timeMs %= 60
    let s = parseInt(timeMs).toString().padStart(2, '0')
    return `[${m}:${s}.${String(ms).padStart(3, '0')}]`
  },
  parseLyric(lrc) {
    lrc = lrc.trim()
    lrc = lrc.replace(/\r/g, '')
    if (!lrc) return { lyric: '', lxlyric: '' }
    const lines = lrc.split('\n')

    const lxlrcLines = []
    const lrcLines = []

    for (let line of lines) {
      line = line.trim()
      let result = this.rxps.lineTime.exec(line)
      if (!result) {
        if (line.startsWith('[offset')) {
          lxlrcLines.push(line)
          lrcLines.push(line)
        }
        if (this.rxps.lineTime2.test(line)) {
          // lxlrcLines.push(line)
          lrcLines.push(line)
        }
        continue
      }

      const startMsTime = parseInt(result[1])
      const startTimeStr = this.msFormat(startMsTime)
      if (!startTimeStr) continue

      let words = line.replace(this.rxps.lineTime, '')

      lrcLines.push(`${startTimeStr}${words.replace(this.rxps.wordTimeAll, '')}`)

      let times = words.match(this.rxps.wordTimeAll)
      if (!times) continue
      times = times.map(time => {
        const result = /\((\d+),(\d+)\)/.exec(time)
        return `<${Math.max(parseInt(result[1]) - startMsTime, 0)},${result[2]}>`
      })
      const wordArr = words.split(this.rxps.wordTime)
      const newWords = times.map((time, index) => `${time}${wordArr[index]}`).join('')
      lxlrcLines.push(`${startTimeStr}${newWords}`)
    }
    return {
      lyric: lrcLines.join('\n'),
      lxlyric: lxlrcLines.join('\n'),
    }
  },
  parseRlyric(lrc) {
    lrc = lrc.trim()
    lrc = lrc.replace(/\r/g, '')
    if (!lrc) return ''
    const lines = lrc.split('\n')

    const lrcLines = []

    for (let line of lines) {
      line = line.trim()
      let result = this.rxps.lineTime.exec(line)
      if (!result) {
        if (this.rxps.lineTime2.test(line)) lrcLines.push(line)
        continue
      }

      const startMsTime = parseInt(result[1])
      const startTimeStr = this.msFormat(startMsTime)
      if (!startTimeStr) continue

      let words = line.replace(this.rxps.lineTime, '')

      lrcLines.push(`${startTimeStr}${words.replace(this.rxps.wordTimeAll, '')}`)
    }
    return lrcLines.join('\n')
  },
  removeTag(str) {
    return str.replace(/^[\S\s]*?LyricContent="/, '').replace(/"\/>[\S\s]*?$/, '')
  },
  getIntv(interval) {
    if (!interval) return 0
    // LRC 的小数位表示秒的小数部分；分钟不能按小时换算。
    const [clock, fraction = ''] = interval.split('.')
    const seconds = clock.split(':').reduce((total, part) => total * 60 + Number(part), 0)
    return seconds * 1000 + Number(fraction.padEnd(3, '0').slice(0, 3))
  },
  // 未匹配的附加歌词不能消耗后续原文行，否则后面的翻译会全部丢失。
  alignTimeTags(extra, lyric) {
    const base = lyric.split('\n').map(line => this.rxps.lineTime2.exec(line)).filter(Boolean)
    let cursor = 0
    const aligned = []
    for (const line of extra.split('\n')) {
      const match = this.rxps.lineTime2.exec(line)
      if (!match || !line.replace(this.rxps.lineTime2, '').trim()) continue
      const time = this.getIntv(match[1])
      while (cursor < base.length && this.getIntv(base[cursor][1]) <= time - 100) cursor++
      if (cursor < base.length && Math.abs(this.getIntv(base[cursor][1]) - time) < 100) {
        aligned.push(line.replace(this.rxps.lineTime2, base[cursor][0]))
        cursor++
      }
    }
    return aligned.join('\n')
  },
  fixRlrcTimeTag(rlrc, lrc) {
    return this.alignTimeTags(rlrc, lrc)
  },
  fixTlrcTimeTag(tlrc, lrc) {
    return this.alignTimeTags(tlrc, lrc)
  },
  parse(lrc, tlrc, rlrc) {
    const info = {
      lyric: '',
      tlyric: '',
      rlyric: '',
      lxlyric: '',
    }
    if (lrc) {
      let { lyric, lxlyric } = this.parseLyric(this.removeTag(lrc))
      info.lyric = lyric
      info.lxlyric = lxlyric
      // console.log(lyric)
      // console.log(lxlyric)
    }
    if (rlrc) info.rlyric = this.fixRlrcTimeTag(this.parseRlyric(this.removeTag(rlrc)), info.lyric)
    if (tlrc) info.tlyric = this.fixTlrcTimeTag(tlrc, info.lyric)
    // console.log(info.lxlyric)
    // console.log(info.lyric)
    // console.log(info.tlyric)
    // console.log(info.rlyric)

    return info
  },
}


export default {
  successCode: 0,
  async getSongId({ songId, songmid }) {
    if (songId) return songId
    if (!songmid) throw new Error('缺少 QQ 歌曲标识')
    if (songIdMap.has(songmid)) return songIdMap.get(songmid)
    // 同一歌曲共用查询；无论成功或失败都释放请求缓存，允许后续重试。
    if (!promises.has(songmid)) {
      const promise = getMusicInfo(songmid).then(info => {
        if (!info?.songId) throw new Error('获取 QQ 歌曲标识失败')
        songIdMap.set(songmid, info.songId)
        return info.songId
      }).finally(() => { promises.delete(songmid) })
      promises.set(songmid, promise)
    }
    return promises.get(songmid)
  },
  async parseLyric(lrc, tlrc, rlrc) {
    const { lyric, tlyric, rlyric } = await decodeLyric(lrc, tlrc, rlrc)
    return parseTools.parse(lyric, tlyric, rlyric)
  },
  getLyric(mInfo) {
    let cancelled = false
    let activeRequest = null
    let rejectCancellation
    let settled = false
    const cancellation = new Promise((resolve, reject) => { rejectCancellation = reject })
    const checkCancelled = () => {
      if (cancelled) throw new Error('取消请求')
    }
    // 每次尝试都返回解析后的歌词，避免重试返回请求对象而非歌词数据。
    const run = async () => {
      let lastError
      for (let attempt = 0; attempt < 4; attempt++) {
        checkCancelled()
        try {
          const songId = await this.getSongId(mInfo)
          checkCancelled()
          activeRequest = httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
            method: 'post',
            headers: {
              referer: 'https://y.qq.com',
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
            },
            body: {
              comm: {
                ct: '19',
                cv: '1859',
                uin: '0',
              },
              req: {
                method: 'GetPlayLyricInfo',
                module: 'music.musichallSong.PlayLyricInfo',
                param: {
                  format: 'json',
                  crypt: 1,
                  ct: 19,
                  cv: 1873,
                  interval: 0,
                  lrc_t: 0,
                  qrc: 1,
                  qrc_t: 0,
                  roma: 1,
                  roma_t: 0,
                  songID: songId,
                  trans: 1,
                  trans_t: 0,
                  type: -1,
                },
              },
            },
          })
          const { body } = await activeRequest.promise
          activeRequest = null
          checkCancelled()
          if (body?.code !== this.successCode || body.req?.code !== this.successCode || !body.req.data) {
            throw new Error('Get lyric failed')
          }
          const data = body.req.data
          const result = await this.parseLyric(data.lyric, data.trans, data.roma)
          checkCancelled()
          if (data.lyric && !result.lyric) throw new Error('QQ 歌词解析失败')
          return result
        } catch (error) {
          activeRequest = null
          checkCancelled()
          lastError = error
        }
      }
      throw lastError
    }
    return {
      promise: Promise.race([run(), cancellation]).finally(() => { settled = true }),
      cancelHttp() {
        if (cancelled || settled) return
        cancelled = true
        rejectCancellation(new Error('取消请求'))
        activeRequest?.cancelHttp()
      },
    }
  },
}
