// src/utils/musicSdk/wy/dailyRec.js

import { httpFetch } from '../../request'
import musicDetailApi from './musicDetail'
import { weapi } from './utils/crypto' // 导入 weapi

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
}
