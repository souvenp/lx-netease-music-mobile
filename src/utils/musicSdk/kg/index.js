import leaderboard from './leaderboard'
import { apis } from '../api-source'
import songList from './songList'
import musicSearch from './musicSearch'
import pic from './pic'
import lyric from './lyric'
import hotSearch from './hotSearch'
import comment from './comment'
import {resolveQualityAlias} from "@/utils/musicSdk/utils";
// import tipSearch from './tipSearch'

const kg = {
  // tipSearch,
  leaderboard,
  songList,
  musicSearch,
  hotSearch,
  comment,
  getMusicUrl(songInfo, type) {
    const qualityToRequest = resolveQualityAlias('kg', type);
    return apis('kg').getMusicUrl(songInfo, qualityToRequest);
  },
  getLyric(songInfo) {
    return lyric.getLyric(songInfo)
  },
  // getLyric(songInfo) {
  //   return apis('kg').getLyric(songInfo)
  // },
  getPic(songInfo) {
    return pic.getPic(songInfo)
  },
  getMusicDetailPageUrl(songInfo) {
    return `https://www.kugou.com/song/#hash=${songInfo.hash}&album_id=${songInfo.albumId}`
  },
  // getPic(songInfo) {
  //   return apis('kg').getPic(songInfo)
  // },
}

export default kg
