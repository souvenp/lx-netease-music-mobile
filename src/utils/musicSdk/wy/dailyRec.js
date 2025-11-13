import { httpFetch } from '../../request'
import musicDetailApi from './musicDetail'
import { weapi } from './utils/crypto'
import settingState from "@/store/setting/state"

export default {
  _requestObj: null,
  async getList(cookie, retryNum = 0) {
    if (this._requestObj) this._requestObj.cancelHttp()
    if (retryNum > 2) return Promise.reject(new Error('try max num'))
    const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1];

    const _requestObj = httpFetch('https://music.163.com/weapi/v3/discovery/recommend/songs', {
      method: 'post',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi({
        offset: 0,
        total: true,
        limit: 50,
        csrf_token: csrfToken || '',
      }),
    })

    const { body, statusCode } = await _requestObj.promise
    if (statusCode !== 200 || body.code !== 200) throw new Error('获取每日推荐失败')

    const filteredList = await musicDetailApi.filterList({ songs: body.data.dailySongs, privileges: [] })

    return {
      list: filteredList,
      source: 'wy',
    }
  },

  async getRecPlaylists(cookie, retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('try max num'))

    try {
      const _requestObj = httpFetch('https://music.163.com/weapi/v1/discovery/recommend/resource', {
        method: 'post',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
          origin: 'https://music.163.com',
          Referer: 'https://music.163.com',
          cookie,
        },
        form: weapi({
          csrf_token: '',
        }),
      })
      const { body, statusCode } = await _requestObj.promise
      if (statusCode !== 200 || body.code !== 200) throw new Error('获取每日推荐歌单失败')
      return body.recommend || []
    } catch (error) {
      return this.getRecPlaylists(cookie, retryNum + 1);
    }
  },

  async getSimilarSongs(songId, limit = 10, offset = 0, retryNum = 0) {
    const maxRetries = 3
    const retryDelay = 1000

    const cookie = settingState.setting['common.wy_cookie']
    if (!cookie) return Promise.reject(new Error('未设置Cookie'))

    try {
      const requestObj = httpFetch('https://music.163.com/weapi/v1/discovery/simiSong', {
        method: 'post',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
          origin: 'https://music.163.com',
          Referer: 'https://music.163.com',
          cookie,
        },
        form: weapi({
          songid: songId,
          limit,
          offset,
        }),
      })
      const { body, statusCode } = await requestObj.promise
      if (statusCode !== 200 || body.code !== 200) {
        throw new Error((body && body.message) || '获取相似歌曲失败')
      }
      return body.songs
    } catch (error) {
      console.error(`获取相似歌曲失败 (尝试 ${retryNum + 1}/${maxRetries}):`, error)
      if (retryNum < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return this.getSimilarSongs(songId, limit, offset, retryNum + 1)
      } else {
        console.error('获取相似歌曲失败 (已达最大重试次数)', error)
        throw error
      }
    }
  },
}
