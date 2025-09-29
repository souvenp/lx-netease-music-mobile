// src/utils/musicSdk/wy/artist.js

import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import musicDetailApi from './musicDetail'

export default {
  /**
   * 获取歌手详情
   * @param {string} id 歌手ID
   */
  async getDetail(id, retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('获取歌手详情失败'));
    const requestObj = httpFetch('https://music.163.com/weapi/artist/head/info/get', {
      method: 'post',
      form: weapi({ id }),
    });
    try {
      const { body } = await requestObj.promise;
      if (body.code !== 200) throw new Error('获取歌手详情失败');
      return body.data;
    } catch (error) {
      return this.getDetail(id, retryNum + 1);
    }
  },

  async getSongs(id, order = 'hot', limit = 100, offset = 0, retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('获取歌手歌曲失败'));
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
    });
    try {
      const { body } = await requestObj.promise;
      if (body.code !== 200) throw new Error('获取歌手歌曲失败');
      const list = await musicDetailApi.filterList({ songs: body.songs, privileges: [] });
      return {
        list,
        total: body.total,
        hasMore: body.more,
      };
    } catch (error) {
      return this.getSongs(id, order, limit, offset, retryNum + 1);
    }
  },

  async getAlbums(id, limit = 100, offset = 0, retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('获取歌手专辑失败'));
    const requestObj = httpFetch('https://music.163.com/weapi/artist/albums/' + id, {
      method: 'post',
      form: weapi({
        limit,
        offset,
        total: true,
      }),
    });
    try {
      const { body } = await requestObj.promise;
      if (body.code !== 200) throw new Error('获取歌手专辑失败');
      return {
        hotAlbums: body.hotAlbums,
        hasMore: body.more,
      };
    } catch (error) {
      return this.getAlbums(id, limit, offset, retryNum + 1);
    }
  },

}
