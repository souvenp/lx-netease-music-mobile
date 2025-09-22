import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import musicDetailApi from './musicDetail'

export default {
  /**
   * 获取专辑详情和歌曲
   * @param {string} albumId
   */
  getAlbum(albumId) {
    const requestObj = httpFetch(`https://music.163.com/weapi/v1/album/${albumId}`, {
      method: 'post',
      form: weapi({}),
    })
    return requestObj.promise.then(async({ body }) => {
      if (body.code !== 200) throw new Error('获取专辑详情失败')
      // 使用 privileges 来获取更准确的音质信息
      const privileges = body.songs.map(song => song.privilege)
      const list = await musicDetailApi.filterList({ songs: body.songs, privileges })
      return {
        list,
        info: body.album,
      }
    })
  },
}
