import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import {dateFormat, formatPlayTime, sizeFormate} from '../../index'
import { getBatchMusicQualityInfo } from './quality_detail'
import { updateListMusics } from '@/core/list'
import playerState from '@/store/player/state'
import {allMusicList} from "@/utils/listManage";

const fetchingDetails = new Set()

/**
 * 按需获取单首歌曲的详细音质信息，并补充到现有信息中
 */
export const fetchAndApplyDetailedQuality = async(musicInfo, retryNum = 0) => {
  let latestMusicInfo = null
  for (const list of allMusicList.values()) {
    const found = list.find(item => item.id === musicInfo.id)
    if (found) {
      console.log("found", found)
      latestMusicInfo = found
      break
    }
  }
  const currentMusicInfo = latestMusicInfo || musicInfo
  console.log("found -> currentMusicInfo", currentMusicInfo)
  if (currentMusicInfo.meta._full) return currentMusicInfo

  const songId = currentMusicInfo.meta.songId
  if (fetchingDetails.has(songId) && retryNum === 0) return currentMusicInfo
  if (retryNum === 0) fetchingDetails.add(songId)

  try {
    const requestObj = httpFetch(`https://music.163.com/api/song/music/detail/get?songId=${songId}`, {
      method: 'get',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        origin: 'https://music.163.com',
      },
    })
    const { body, statusCode } = await requestObj.promise

    if (statusCode !== 200 || !body || body.code !== 200) {
      throw new Error('Failed to get song quality information from API')
    }

    const data = body.data

    const newTypes = [...musicInfo.meta.qualitys]
    const new_Types = { ...musicInfo.meta._qualitys }

    if (data.jm && data.jm.size && !new_Types.master) {
      const size = sizeFormate(data.jm.size)
      newTypes.push({ type: 'master', size })
      new_Types.master = { size }
    }
    if (data.db && data.db.size && !new_Types.atmos) {
      const size = sizeFormate(data.db.size)
      newTypes.push({ type: 'atmos', size })
      new_Types.atmos = { size }
    }

    const updatedMusicInfo = {
      ...musicInfo,
      meta: {
        ...musicInfo.meta,
        qualitys: newTypes,
        _qualitys: new_Types,
        _full: true, // 标记为已获取完整信息
      },
    }

    // 找到这首歌存在的所有列表ID
    const listIdsToUpdate = [];
    for (const [listId, list] of allMusicList.entries()) {
      if (list.some(item => item.id === musicInfo.id)) {
        listIdsToUpdate.push(listId);
      }
    }

    // 在所有包含这首歌的列表中更新它的信息
    if (listIdsToUpdate.length) {
      console.log('updateListMusics');
      void updateListMusics(listIdsToUpdate.map(id => ({ id, musicInfo: updatedMusicInfo })));
    } else {
      console.log('global.app_event.musicInfoUpdate');
      global.app_event.musicInfoUpdate(updatedMusicInfo);
    }

    // 如果当前播放的就是这首歌，也需要更新播放器内的状态
    if (playerState.playMusicInfo.musicInfo?.id === musicInfo.id) {
      console.log('updatePlayMusicInfo');
      playerState.playMusicInfo.musicInfo.meta = updatedMusicInfo.meta;
    }

    fetchingDetails.delete(songId)
    return updatedMusicInfo

  } catch (error) {
    if (++retryNum > 2) {
      console.error(`Failed to fetch details for ${musicInfo.name} after max retries:`, error)
      fetchingDetails.delete(songId)
      return { ...musicInfo, meta: { ...musicInfo.meta, _full: false } }
    }

    const delay = 200
    console.log(`Retrying fetch details for ${musicInfo.name} in ${delay}ms... (Attempt ${retryNum})`)
    await new Promise(resolve => setTimeout(resolve, delay))

    return fetchAndApplyDetailedQuality(musicInfo, retryNum)
  }
}

export default {
  getSinger(singers) {
    let arr = []
    singers?.forEach((singer) => {
      arr.push(singer.name)
    })
    return arr.join('、')
  },
  async filterList({ songs, privileges }) {
    if (songs.length && songs[0].album && songs[0].duration != null) {
      // 将其转换为后续流程期望的格式 (ar, al, dt)
      songs = songs.map(item => ({
        id: item.id,
        name: item.name,
        ar: item.artists, // 将 artists 映射到 ar
        al: item.album,   // 将 album 映射到 al
        dt: item.duration, // 将 duration (毫秒) 映射到 dt
        publishTime: item.album?.publishTime,
        pc: item.pc, // 保留可能存在的 pc 字段
        l: item.lMusic,
        m: item.mMusic,
        h: item.hMusic,
        sq: item.sqMusic,
        hr: item.hrMusic
      }));
    }

    const list = []
    let qualityInfoMap = {}


    // --- 新增的逻辑判断 ---
    // 检查传入的歌曲对象是否已经自带了音质信息（h, m, l, sq等）
    if (songs.length && (songs[0].h || songs[0].m || songs[0].l || songs[0].sq)) {
      // 如果有，则直接从现有数据构建 qualityInfoMap，不再发起网络请求
      songs.forEach(item => {
        const types = []
        const _types = {}
        let size

        if (item.hr) {
          size = sizeFormate(item.hr.size)
          types.push({ type: 'hires', size })
          _types.hires = { size }
        }
        if (item.sq) {
          size = sizeFormate(item.sq.size)
          types.push({ type: 'flac', size })
          _types.flac = { size }
        }
        if (item.h) {
          size = sizeFormate(item.h.size)
          types.push({ type: '320k', size })
          _types['320k'] = { size }
        }
        if (item.m) {
          size = sizeFormate(item.m.size)
          types.push({ type: '128k', size })
          _types['128k'] = { size }
        }
        if (item.l) {
          size = sizeFormate(item.l.size)
          if (!_types['128k']) { // 有些歌曲可能只有l音质
            types.push({ type: '128k', size })
            _types['128k'] = { size }
          }
        }
        types.reverse()
        qualityInfoMap[item.id] = { types, _types }
      })
    } else {
      // --- 保留原有逻辑 ---
      // 如果没有自带音质信息，才去批量请求
      const idList = songs.map((item) => item.id)
      qualityInfoMap = await getBatchMusicQualityInfo(idList)
    }

    songs.forEach((item, index) => {
      const { types = [], _types = {} } = qualityInfoMap[item.id] || { types: [], _types: {} }

      if (item.pc) {
        list.push({
          id: 'wy_' + item.id,
          name: item.pc.sn ?? '',
          singer: item.pc.ar ?? '',
          source: 'wy',
          interval: formatPlayTime(item.dt / 1000),
          meta: {
            songId: item.id,
            fee: item.fee,
            albumName: item.pc.alb ?? '',
            albumId: item.al?.id,
            picUrl: item.al?.picUrl,
            qualitys: types,
            _qualitys: _types,
          },
          releaseDate: item.publishTime ? dateFormat(item.publishTime, 'Y-M-D') : null,
          songmid: item.id,
          img: item.al?.picUrl ?? '',
          lrc: null,
          otherSource: null,
          types,
          _types,
          typeUrl: {},
        })
      } else {
        list.push({
          id: 'wy_' + item.id,
          name: item.name ?? '',
          alias: item.alia && item.alia.length ? item.alia[0] : '',
          singer: this.getSinger(item.ar),
          artists: item.ar,
          albumName: item.al?.name,
          albumId: item.al?.id,
          source: 'wy',
          interval: formatPlayTime(item.dt / 1000),
          meta: {
            songId: item.id,
            fee: item.fee,
            albumName: item.al?.name,
            albumId: item.al?.id,
            picUrl: item.al?.picUrl,
            qualitys: types,
            _qualitys: _types,
            originCoverType: item.originCoverType,
            mv: item.mv,
          },
          releaseDate: item.publishTime ? dateFormat(item.publishTime, 'Y-M-D') : null,
          songmid: item.id,
          img: item.al?.picUrl,
          lrc: null,
          otherSource: null,
          types,
          _types,
          typeUrl: {},
        })
      }
    })
    return list
  },
  async getList(ids = [], retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('try max num'))

    const requestObj = httpFetch('https://music.163.com/weapi/v3/song/detail', {
      method: 'post',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        origin: 'https://music.163.com',
      },
      form: weapi({
        c: '[' + ids.map((id) => '{"id":' + id + '}').join(',') + ']',
        ids: '[' + ids.join(',') + ']',
      }),
    })
    const { body, statusCode } = await requestObj.promise
    if (statusCode != 200 || body.code !== 200) throw new Error('获取歌曲详情失败')
    return { source: 'wy', list: await this.filterList(body) }
  },
}
