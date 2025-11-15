import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import settingState from '@/store/setting/state'

export const getMusicUrl = (songInfo, type, retryNum = 0) => {
  if (retryNum > 2) {
    const requestObj = {}
    requestObj.promise = Promise.reject(new Error('try max num'))
    requestObj.cancelHttp = () => {}
    return requestObj
  }

  const songId = songInfo.songmid || songInfo.meta.songId
  const targetPrefer = {
    level: 'standard', // standard, higher, exhigh, lossless, hires, jyeffect, jymaster
    encodeType: 'flac',
  }
  switch (type) {
    case '128k':
      targetPrefer.level = 'standard'
      break
    case '320k':
      targetPrefer.level = 'exhigh'
      break
    case 'flac':
      targetPrefer.level = 'lossless'
      targetPrefer.encodeType = 'aac'
      break
    case 'hires':
      targetPrefer.level = 'hires'
      targetPrefer.encodeType = 'flac'
      break
    case 'master':
      targetPrefer.level = 'jymaster'
      targetPrefer.encodeType = 'flac'
      break
    default:
      targetPrefer.level = 'exhigh'
      break
  }

  const cookie = settingState.setting['common.wy_cookie']
  const requestObj = httpFetch('https://music.163.com/weapi/song/enhance/player/url/v1', {
    method: 'post',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
      origin: 'https://music.163.com',
      Referer: 'https://music.163.com',
      cookie,
    },
    form: weapi({
      ids: `[${songId}]`,
      level: targetPrefer.level,
      encodeType: targetPrefer.encodeType,
    }),
  })

  requestObj.promise = requestObj.promise.then(({ body, statusCode }) => {
    if (statusCode !== 200 || body.code !== 200) {
      throw new Error('Cookie request failed')
    }

    const data = body.data[0]
    if (!data.url) {
      if (data.fee === 1 || data.fee === 4) {
        return Promise.reject(new Error('VIP 歌曲或无版权，无法通过 Cookie 获取'))
      }
      return Promise.reject(new Error('未能获取到播放链接'))
    }

    return {
      type,
      url: data.url,
      level: data.level,
    }
  }).catch(err => {
    if (err.message.includes('VIP') || err.message.includes('未能获取')) {
      throw err
    }

    console.log('wy api-cookie getMusicUrl error, retrying...', retryNum + 1)
    const newRequestObj = getMusicUrl(songInfo, type, retryNum + 1)
    requestObj.cancelHttp = newRequestObj.cancelHttp
    return newRequestObj.promise
  })

  return requestObj
}
