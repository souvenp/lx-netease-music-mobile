// src/utils/musicSdk/wy/musicDetail.js

import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import {dateFormat, formatPlayTime, sizeFormate} from '../../index' // <--- 引入 sizeFormate
import { getBatchMusicQualityInfo } from './quality_detail'

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
