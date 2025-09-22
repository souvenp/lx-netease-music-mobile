// src/utils/musicSdk/wy/artist.js

import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import musicDetailApi from './musicDetail'

export default {
  /**
   * 获取歌手详情
   * @param {string} id 歌手ID
   */
  getDetail(id) {
    const requestObj = httpFetch('https://music.163.com/weapi/artist/head/info/get', {
      method: 'post',
      form: weapi({ id }),
    })
    return requestObj.promise.then(({ body }) => {
      if (body.code !== 200) throw new Error('获取歌手详情失败')
      return body.data
    })
  },

  /**
   * 获取歌手歌曲
   * @param {string} id 歌手ID
   * @param {string} order 'hot' 或 'time'
   * @param {number} limit
   * @param {number} offset
   */
  getSongs(id, order = 'hot', limit = 100, offset = 0) {
    const requestObj = httpFetch('https://music.163.com/weapi/v1/artist/songs', {
      method: 'post',
      form: weapi({
        id,
        private_cloud: 'true',
        work_type: 1,
        order,
        offset,
        limit,
      }),
    })
    return requestObj.promise.then(async({ body }) => {
      if (body.code !== 200) throw new Error('获取歌手歌曲失败')
      const list = await musicDetailApi.filterList({ songs: body.songs, privileges: [] })
      return {
        list,
        total: body.total,
        hasMore: body.more,
      }
    })
  },

  /**
   * 获取歌手专辑
   * @param {string} id 歌手ID
   * @param {number} limit
   * @param {number} offset
   */
  getAlbums(id, limit = 100, offset = 0) {
    const requestObj = httpFetch('https://music.163.com/weapi/artist/albums/' + id, {
      method: 'post',
      form: weapi({
        limit,
        offset,
        total: true,
      }),
    })
    return requestObj.promise.then(({ body }) => {
      if (body.code !== 200) throw new Error('获取歌手专辑失败')
      return {
        hotAlbums: body.hotAlbums,
        hasMore: body.more,
      }
    })
  },

}
