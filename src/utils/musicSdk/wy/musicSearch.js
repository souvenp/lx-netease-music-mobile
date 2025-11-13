import { httpFetch } from '../../request'
import { sizeFormate, formatPlayTime } from '../../index'
import { eapiRequest } from './utils/index'

export default {
  limit: 30,
  total: 0,
  page: 0,
  allPage: 1,

  musicSearch(str, page, limit) {
    const searchRequest = eapiRequest('/api/cloudsearch/pc', {
      s: str,
      type: 1,
      limit,
      total: page == 1,
      offset: limit * (page - 1),
    })
    return searchRequest.promise.then(({ body }) => body)
  },

  getSinger(singers) {
    return singers.map((singer) => singer.name).join('、')
  },

  // handleResult(rawList) {
  //   if (!rawList) return []
  //
  //   return Promise.all(
  //     rawList.map(async (item) => {
  //       const types = []
  //       const _types = {}
  //       let size
  //
  //       try {
  //         const requestObj = httpFetch(
  //           `https://music.163.com/api/song/music/detail/get?songId=${item.id}`,
  //           {
  //             method: 'get',
  //             headers: {
  //               'User-Agent':
  //                 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
  //               origin: 'https://music.163.com',
  //             },
  //           }
  //         )
  //
  //         const { body, statusCode } = await requestObj.promise
  //
  //         if (statusCode !== 200 || !body || body.code !== 200) {
  //           throw new Error('Failed to get song quality information')
  //         }
  //
  //         if (body.data.jm && body.data.jm.size) {
  //           size = sizeFormate(body.data.jm.size)
  //           types.push({ type: 'master', size })
  //           _types.master = { size }
  //         }
  //         if (body.data.db && body.data.db.size) {
  //           size = sizeFormate(body.data.db.size)
  //           types.push({ type: 'dolby', size })
  //           _types.dolby = { size }
  //         }
  //         if (body.data.hr && body.data.hr.size) {
  //           size = sizeFormate(body.data.hr.size)
  //           types.push({ type: 'hires', size })
  //           _types.hires = { size }
  //         }
  //         if (body.data.sq && body.data.sq.size) {
  //           size = sizeFormate(body.data.sq.size)
  //           types.push({ type: 'flac', size })
  //           _types.flac = { size }
  //         }
  //         if (body.data.h && body.data.h.size) {
  //           size = sizeFormate(body.data.h.size)
  //           types.push({ type: '320k', size })
  //           _types['320k'] = { size }
  //         }
  //         if (body.data.m && body.data.m.size) {
  //           size = sizeFormate(body.data.m.size)
  //           types.push({ type: '128k', size })
  //           _types['128k'] = { size }
  //         } else if (body.data.l && body.data.l.size) {
  //           size = sizeFormate(body.data.l.size)
  //           types.push({ type: '128k', size })
  //           _types['128k'] = { size }
  //         }
  //
  //         types.reverse()
  //
  //         return {
  //           singer: this.getSinger(item.ar),
  //           artists: item.ar,
  //           name: item.name,
  //           fee: item.fee,
  //           alias: item.alia && item.alia.length ? item.alia[0] : '',
  //           albumName: item.al.name,
  //           albumId: item.al.id,
  //           source: 'wy',
  //           interval: formatPlayTime(item.dt / 1000),
  //           songmid: item.id,
  //           img: item.al.picUrl,
  //           lrc: null,
  //           types,
  //           _types,
  //           typeUrl: {},
  //           meta: {
  //             songId: item.id,
  //             albumName: item.al.name,
  //             albumId: item.al.id,
  //             picUrl: item.al.picUrl,
  //             qualitys: types,
  //             _qualitys: _types,
  //             fee: item.fee,
  //             originCoverType: item.originCoverType,
  //           },
  //         }
  //       } catch (error) {
  //         console.error(error.message)
  //         return null
  //       }
  //     })
  //   )
  // },
  handleResult(rawList) {
    if (!rawList) return [];

    return rawList.map(item => {
      const types = [];
      const _types = {};
      let size;

      if (item.hr) {
        size = sizeFormate(item.hr.size);
        types.push({ type: 'hires', size });
        _types.hires = { size };
      }
      if (item.sq) {
        size = sizeFormate(item.sq.size);
        types.push({ type: 'flac', size });
        _types.flac = { size };
      }
      if (item.h) {
        size = sizeFormate(item.h.size);
        types.push({ type: '320k', size });
        _types['320k'] = { size };
      }
      if (item.m && !_types['128k']) {
        size = sizeFormate(item.m.size);
        types.push({ type: '128k', size });
        _types['128k'] = { size };
      }
      if (item.l && !_types['128k']) {
        size = sizeFormate(item.l.size);
        types.push({ type: '128k', size });
        _types['128k'] = { size };
      }
      types.reverse();

      return {
        singer: this.getSinger(item.ar),
        artists: item.ar,
        name: item.name,
        fee: item.fee,
        alias: item.alia && item.alia.length ? item.alia[0] : '',
        albumName: item.al.name,
        albumId: item.al.id,
        source: 'wy',
        interval: formatPlayTime(item.dt / 1000),
        songmid: item.id,
        img: item.al.picUrl,
        lrc: null,
        types,
        _types,
        typeUrl: {},
        meta: {
          songId: item.id,
          albumName: item.al.name,
          albumId: item.al.id,
          picUrl: item.al.picUrl,
          qualitys: types,
          _qualitys: _types,
          fee: item.fee,
          originCoverType: item.originCoverType,
        },
      }
    })
  },

  search(str, page = 1, limit, retryNum = 0) {
    if (++retryNum > 3) return Promise.reject(new Error('try max num'))
    if (limit == null) limit = this.limit
    return this.musicSearch(str, page, limit).then((result) => {
      if (!result || result.code !== 200) {
        console.log('retry search:', retryNum)
        return this.search(str, page, limit, retryNum)
      }
      const list = this.handleResult(result.result.songs || [])
      if (!list) return this.search(str, page, limit, retryNum)

      this.total = result.result.songCount || 0
      this.page = page
      this.allPage = Math.ceil(this.total / this.limit)

      return {
        list,
        allPage: this.allPage,
        limit: this.limit,
        total: this.total,
        source: 'wy',
      }
    }).catch(err => {
      console.log('搜索错误，准备重试:', err.message, '次数:', retryNum);
      return this.search(str, page, limit, retryNum)
    });
  },


  searchSinger(str, page = 1, limit = 20, retryNum = 0) {
    if (++retryNum > 3) return Promise.reject(new Error('try max num'))
    const searchRequest = eapiRequest('/api/cloudsearch/pc', {
      s: str,
      type: 100,
      limit,
      total: page === 1,
      offset: limit * (page - 1),
    })
    return searchRequest.promise.then(({ body: result }) => {
      if (!result || result.code !== 200) return this.searchSinger(str, page, limit, retryNum)
      const list = this.handleSingerResult(result.result.artists)
      return {
        list,
        total: result.result.artistCount || 0,
        allPage: Math.ceil((result.result.artistCount || 0) / limit),
        limit,
        source: 'wy',
      }
    })
  },

  searchAlbum(str, page = 1, limit = 20, retryNum = 0) {
    if (++retryNum > 3) return Promise.reject(new Error('try max num'))
    const searchRequest = eapiRequest('/api/cloudsearch/pc', {
      s: str,
      type: 10,
      limit,
      total: page === 1,
      offset: limit * (page - 1),
    })
    return searchRequest.promise.then(({ body: result }) => {
      if (!result || result.code !== 200) return this.searchAlbum(str, page, limit, retryNum)
      const list = this.handleAlbumResult(result.result.albums)
      return {
        list,
        total: result.result.albumCount || 0,
        allPage: Math.ceil((result.result.albumCount || 0) / limit),
        limit,
        source: 'wy',
      }
    })
  },
  handleSingerResult(rawList) {
    if (!rawList) return []
    return rawList.map(item => ({
      id: item.id,
      name: item.name,
      picUrl: item.picUrl,
      alias: item.alias,
      albumSize: item.albumSize,
      source: 'wy',
    }))
  },

  handleAlbumResult(rawList) {
    if (!rawList) return []
    return rawList.map(item => ({
      id: item.id,
      name: item.name,
      picUrl: item.picUrl,
      artistName: item.artist.name,
      artistId: item.artist.id,
      size: item.size,
      publishTime: item.publishTime,
      source: 'wy',
    }))
  },

}
