import leaderboard from './leaderboard'
import songList from './songList'
import hotSearch from './hotSearch'
import tipSearch from './tipSearch'
import musicSearch from './musicSearch'
import lyric from './lyric'
import { GITCODE_CONFIG } from './util'
import { getMusicUrl as _getMusicUrl } from './api'

const git = {
  leaderboard,
  songList,
  hotSearch,
  tipSearch,
  musicSearch,

  getLyric(songInfo) {
    const requestObj = new Object()
    requestObj.promise = lyric.getLyric(songInfo)
    return requestObj
  },

  getMusicUrl(songInfo, type) {
    const requestObj = new Object()
    requestObj.promise = _getMusicUrl(songInfo, type)
    return requestObj
  },

  getPic(songInfo) {
    const requestObj = new Object()
    requestObj.promise = Promise.resolve(songInfo.img)
    return requestObj
  },

  /**
   * 获取歌曲详情页URL
   */
  getMusicDetailPageUrl(songInfo) {
    // 返回Gitcode仓库页面
    return `https://gitcode.com/${GITCODE_CONFIG.owner}/${GITCODE_CONFIG.repo}`
  },
}

export default git
