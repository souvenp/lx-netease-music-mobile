import { apis } from '../api-source'
import leaderboard from './leaderboard'
import songList from './songList'
import musicSearch from './musicSearch'
import pic from './pic'
import lyric from './lyric'
import hotSearch from './hotSearch'
import comment from './comment'
import {resolveQualityAlias} from "@/utils/musicSdk/utils";
// import tipSearch from './tipSearch'

const mg = {
  // tipSearch,
  songList,
  musicSearch,
  leaderboard,
  hotSearch,
  comment,
  getMusicUrl(songInfo, type) {
    const qualityToRequest = resolveQualityAlias('mg', type); // 2. 解析音质
    return apis('mg').getMusicUrl(songInfo, qualityToRequest);
  },
  getLyric(songInfo) {
    return lyric.getLyric(songInfo)
  },
  getPic(songInfo) {
    return pic.getPic(songInfo)
  },
  getMusicDetailPageUrl(songInfo) {
    return `http://music.migu.cn/v3/music/song/${songInfo.copyrightId}`
  },
}

export default mg
