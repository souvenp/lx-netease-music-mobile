import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import { getWyUidCache, saveWyUidCache } from '@/utils/data'
import { toMD5 } from '@/utils/tools'

export default {
  async getUid(cookie) {
    if (!cookie) throw new Error('Cookie is required to get UID')

    const hashedCookie = toMD5(cookie)
    const cachedUid = await getWyUidCache(hashedCookie)
    if (cachedUid) return cachedUid

    const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1]
    const request = httpFetch('https://music.163.com/weapi/nuser/account/get', {
      method: 'post',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi({
        csrf_token: csrfToken || '',
      }),
    })

    const { body, statusCode } = await request.promise
    if (statusCode !== 200 || body.code !== 200) throw new Error('获取UID失败')
    const uid = body.account.id
    await saveWyUidCache(hashedCookie, String(uid))
    return uid
  },

  async getLikedSongList(uid, cookie) {
    const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1]
    const request = httpFetch('https://music.163.com/weapi/song/like/get', {
      method: 'post',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi({
        uid: String(uid), // 确保uid是字符串
        csrf_token: csrfToken || '',
      }),
    })
    const { body, statusCode } = await request.promise
    if (statusCode !== 200 || body.code !== 200) throw new Error('获取喜欢列表歌曲失败')
    return body.ids || []
  },

  /**
   * 获取用户歌单
   * @param {string} uid
   * @param {string} cookie
   */
  getUserPlaylists(uid, cookie) {
    const requestObj = httpFetch('https://music.163.com/weapi/user/playlist', {
      method: 'post',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
        origin: 'https://music.163.com',
        Referer: `https://music.163.com/user/home?id=${uid}`,
        cookie,
      },
      form: weapi({
        uid,
        limit: 1000, // 通常一次性获取全部
        offset: 0,
        includeVideo: true,
      }),
    });
    return requestObj.promise.then(({ body }) => {
      if (body.code !== 200) throw new Error('获取用户歌单失败');
      return body.playlist;
    });
  },


  /**
   * 获取关注的歌手列表
   * @param {number} limit
   * @param {number} offset
   */
  getSublist(limit = 50, offset = 0) {
    const requestObj = httpFetch('https://music.163.com/weapi/artist/sublist', {
      method: 'post',
      form: weapi({
        limit,
        offset,
        total: true,
      }),
    })
    return requestObj.promise.then(({ body }) => {
      if (body.code !== 200) throw new Error('获取关注歌手列表失败')
      return body.data
    })
  },

  /**
   * 关注/取消关注歌手
   * @param {string} id 歌手ID
   * @param {boolean} isFollow true为关注, false为取消关注
   */
  async followSinger(id, isFollow) {
    const cookie = settingState.setting['common.wy_cookie']
    if (!cookie) return Promise.reject(new Error('未设置Cookie'))

    const action = isFollow ? 'sub' : 'unsub'
    const requestObj = httpFetch(`https://music.163.com/weapi/artist/${action}`, {
      method: 'post',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi({
        artistId: id,
        artistIds: `['${id}']`,
      }),
    })

    const { body, statusCode } = await requestObj.promise
    if (statusCode !== 200 || body.code !== 200) {
      throw new Error((body && body.message) || '操作失败')
    }
    return body
  },
}
