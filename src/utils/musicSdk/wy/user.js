import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import { getWyUidCache, saveWyUidCache } from '@/utils/data'
import {toast, toMD5} from '@/utils/tools'
import settingState from "@/store/setting/state";
import {setWyVipType} from "@/store/user/action";

export default {
  async getUid(cookie, retryNum = 0) {
    if (!cookie) throw new Error('Cookie is required to get UID');
    const maxRetries = 3;
    const retryDelay = 200;

    try {
      const hashedCookie = toMD5(cookie);
      const cachedUid = await getWyUidCache(hashedCookie);
      if (cachedUid) return cachedUid;

      const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1];
      const request = httpFetch('https://music.163.com/weapi/nuser/account/get', {
        method: 'post',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
          origin: 'https://music.163.com',
          Referer: 'https://music.163.com',
          cookie,
        },
        form: weapi({
          csrf_token: csrfToken || '',
        }),
      });
      const { body, statusCode } = await request.promise;

      if (statusCode !== 200 || body.code !== 200) throw new Error('获取UID失败');
      if (!body.account) {
        toast('登录已过期或Cookie无效', 'long');
        throw new Error('登录已过期或Cookie无效');
      }

      const uid = body.account.id;
      setWyVipType(body.account.vipType);
      await saveWyUidCache(hashedCookie, String(uid));
      return uid;
    } catch (error) {
      if (retryNum < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.getUid(cookie, retryNum + 1);
      } else {
        console.error('获取UID失败 (重试次数已达上限)', error);
        throw error;
      }
    }
  },

  async likeSong(songId, like, retryNum = 0) {
    const maxRetries = 3;
    const retryDelay = 200;
    const cookie = settingState.setting['common.wy_cookie'];
    if (!cookie) return Promise.reject(new Error('未设置Cookie'));

    const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1];
    const data = {
      trackId: songId,
      like,
      time: 3,
      alg: 'itembased',
      csrf_token: csrfToken || '',
    };

    const requestObj = httpFetch('https://music.163.com/weapi/song/like', {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi(data),
    });

    try {
      const { body, statusCode } = await requestObj.promise;
      if (statusCode !== 200 || body.code !== 200) {
        throw new Error((body && body.message) || '操作失败');
      }
      return body;
    } catch (error) {
      if (retryNum < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.likeSong(songId, like, retryNum + 1);
      } else {
        throw error;
      }
    }
  },

  async getLikedSongList(uid, cookie, retryNum = 0) {
    const maxRetries = 3;
    const retryDelay = 200;

    try {
      const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1];
      const request = httpFetch('https://music.163.com/weapi/song/like/get', {
        method: 'post',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
          origin: 'https://music.163.com',
          Referer: 'https://music.163.com',
          cookie,
        },
        form: weapi({
          uid: String(uid), // 确保uid是字符串
          csrf_token: csrfToken || '',
        }),
      });
      const { body, statusCode } = await request.promise;
      if (statusCode !== 200 || body.code !== 200) throw new Error('获取喜欢列表歌曲失败');
      return body.ids || [];
    } catch (error) {
      if (retryNum < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.getLikedSongList(uid, cookie, retryNum + 1);
      } else {
        console.error('获取喜欢列表歌曲失败 (重试次数已达上限)', error);
        throw error;
      }
    }
  },

  async getUserPlaylists(uid, cookie, retryNum = 0) {
    const maxRetries = 3;
    const retryDelay = 200;
    try {
      const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1];
      const requestObj = httpFetch('https://music.163.com/weapi/user/playlist', {
        method: 'post',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
          origin: 'https://music.163.com',
          Referer: `https://music.163.com/user/home?id=${uid}`,
          cookie,
        },
        form: weapi({
          uid,
          limit: 1000,
          offset: 0,
          includeVideo: true,
          csrf_token: csrfToken || '',
        }),
      });
      const { body } = await requestObj.promise;
      if (body.code !== 200) throw new Error('获取用户歌单失败');
      return body.playlist;
    } catch (error) {
      if (retryNum < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.getUserPlaylists(uid, cookie, retryNum + 1);
      } else {
        console.error('获取用户歌单失败 (重试次数已达上限)', error);
        throw error;
      }
    }
  },

  async createPlaylist(name, privacy = '10', retryNum = 0) {
    const maxRetries = 3;
    const retryDelay = 200;
    try {
      const data = {
        name,
        privacy, // 0 普通歌单,默认 10 隐私歌单
        type: 'NORMAL',
      };
      const cookie = settingState.setting['common.wy_cookie'];
      const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1];
      const { body } = await httpFetch('https://music.163.com/weapi/playlist/create', {
        method: 'post',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
          origin: 'https://music.163.com',
          Referer: 'https://music.163.com',
          cookie,
        },
        form: weapi({ ...data, csrf_token: csrfToken || '' }),
      }).promise;
      if (body.code !== 200) throw new Error(body.message || '创建歌单失败');
      return body.playlist;
    } catch (error) {
      if (retryNum < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.createPlaylist(name, privacy, retryNum + 1);
      } else {
        console.error('创建歌单失败 (重试次数已达上限)', error);
        throw error;
      }
    }
  },

  async deletePlaylist(id, retryNum = 0) {
    const maxRetries = 3;
    const retryDelay = 200;
    try {
      const data = {
        ids: '[' + id + ']',
      };
      const cookie = settingState.setting['common.wy_cookie'];
      const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1];
      const { body } = await httpFetch('https://music.163.com/weapi/playlist/remove', {
        method: 'post',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
          origin: 'https://music.163.com',
          Referer: 'https://music.163.com',
          cookie,
        },
        form: weapi({ ...data, csrf_token: csrfToken || '' }),
      }).promise;
      if (body.code !== 200) throw new Error(body.message || '删除歌单失败');
      return body;
    } catch (error) {
      if (retryNum < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.deletePlaylist(id, retryNum + 1);
      } else {
        console.error('删除歌单失败 (重试次数已达上限)', error);
        throw error;
      }
    }
  },

  async updatePlaylist(id, name, desc = '', retryNum = 0) {
    const maxRetries = 3;
    const retryDelay = 200;
    try {
      const data = {
        '/api/playlist/desc/update': `{"id":${id},"desc":"${desc}"}`,
        '/api/playlist/update/name': `{"id":${id},"name":"${name}"}`,
      };
      const cookie = settingState.setting['common.wy_cookie'];
      const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1];
      const { body } = await httpFetch('https://music.163.com/weapi/batch', {
        method: 'post',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/108.0.1462.54',
          origin: 'https://music.163.com',
          Referer: 'https://music.163.com',
          cookie,
        },
        form: weapi({ ...data, csrf_token: csrfToken || '' }),
      }).promise;
      if (body.code !== 200) throw new Error(body.message || '编辑歌单失败');
      return body;
    } catch (error) {
      if (retryNum < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.updatePlaylist(id, name, desc, retryNum + 1);
      } else {
        console.error('编辑歌单失败 (重试次数已达上限)', error);
        throw error;
      }
    }
  },

  async manipulatePlaylistTracks(op, pid, tracks, retryNum = 0) {
    const maxRetries = 3
    const retryDelay = 200

    const trackIds = Array.isArray(tracks) ? tracks.map(String) : [String(tracks)]
    const data = {
      op, // 'add' or 'del'
      pid,
      trackIds: JSON.stringify(trackIds),
      imme: 'true',
    }
    const cookie = settingState.setting['common.wy_cookie']

    const doRequest = (requestData) => {
      return httpFetch('https://music.163.com/weapi/playlist/manipulate/tracks', {
        method: 'post',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
          origin: 'https://music.163.com',
          Referer: 'https://music.163.com',
          cookie,
        },
        form: weapi(requestData),
      }).promise
    }

    try {
      const { body } = await doRequest(data).catch(error => {
        // 网易云返回512代码时，表示歌曲已存在，此时重发一次请求（将歌曲id发两次）可以解决这个问题
        if (error.body && error.body.code === 512) {
          const doubleTrackIdsData = { ...data, trackIds: JSON.stringify([...trackIds, ...trackIds]) }
          return doRequest(doubleTrackIdsData)
        }
        throw error
      })

      if (body.code !== 200 && body.code !== 201) throw new Error(body.message || '操作失败')
      return body
    } catch (error) {
      console.error(`歌曲操作失败 (尝试 ${retryNum + 1}/${maxRetries}):`, error)
      if (retryNum < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return this.manipulatePlaylistTracks(op, pid, tracks, retryNum + 1)
      } else {
        console.error('歌曲操作失败 (已达最大重试次数)', error)
        throw error
      }
    }
  },

  /**
   * 获取关注的歌手列表
   * @param {number} limit
   * @param {number} offset
   */
  async getSublist(limit = 100, offset = 0, retryNum = 0) {
    const maxRetries = 3;
    const retryDelay = 200;
    try {
      const requestObj = httpFetch('https://music.163.com/weapi/artist/sublist', {
        method: 'post',
        form: weapi({
          limit,
          offset,
          total: true,
        }),
      });
      const { body } = await requestObj.promise;
      if (body.code !== 200) throw new Error('获取关注歌手列表失败');
      return body.data;
    } catch (error) {
      if (retryNum < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.getSublist(limit, offset, retryNum + 1);
      } else {
        console.error('获取关注歌手列表失败 (重试次数已达上限)', error);
        throw error;
      }
    }
  },

  async getSubAlbumList(limit = 100, offset = 0, retryNum = 0) {
    const maxRetries = 3;
    const retryDelay = 200;
    try {
      const requestObj = httpFetch('https://music.163.com/weapi/album/sublist', {
        method: 'post',
        form: weapi({
          limit,
          offset,
          total: true,
        }),
      });
      const { body } = await requestObj.promise;
      if (body.code !== 200) throw new Error('获取收藏专辑列表失败');
      return body.data;
    } catch (error) {
      if (retryNum < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.getSubAlbumList(limit, offset, retryNum + 1);
      } else {
        console.error('获取收藏专辑列表失败 (重试次数已达上限)', error);
        throw error;
      }
    }
  },

  /**
   * 关注/取消关注歌手
   * @param {string} id 歌手ID
   * @param {boolean} isFollow true为关注, false为取消关注
   */
  async followSinger(id, isFollow, retryNum = 0) {
    const maxRetries = 3
    const retryDelay = 200
    const cookie = settingState.setting['common.wy_cookie']
    if (!cookie) return Promise.reject(new Error('未设置Cookie'))

    const action = isFollow ? 'sub' : 'unsub'
    const requestObj = httpFetch(`https://music.163.com/weapi/artist/${action}`, {
      method: 'post',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi({
        artistId: id,
        artistIds: `['${id}']`,
      }),
    })

    try {
      const { body, statusCode } = await requestObj.promise
      if (statusCode !== 200 || body.code !== 200) {
        throw new Error((body && body.message) || '操作失败')
      }
      return body
    } catch (error) {
      if (retryNum < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return this.followSinger(id, isFollow, retryNum + 1)
      } else {
        throw error
      }
    }
  },

  async subAlbum(id, isSub, retryNum = 0) {
    const maxRetries = 3
    const retryDelay = 200
    const cookie = settingState.setting['common.wy_cookie'];
    if (!cookie) return Promise.reject(new Error('未设置Cookie'));

    const action = isSub ? 'sub' : 'unsub';
    const requestObj = httpFetch(`https://music.163.com/weapi/album/${action}`, {
      method: 'post',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi({
        id,
      }),
    });

    try {
      const { body, statusCode } = await requestObj.promise;
      if (statusCode !== 200 || body.code !== 200) {
        throw new Error((body && body.message) || '操作失败');
      }
      return body;
    } catch (error) {
      if (retryNum < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.subAlbum(id, isSub, retryNum + 1);
      } else {
        throw error;
      }
    }
  },


  async subPlaylist(id, isSub, retryNum = 0) {
    const maxRetries = 3;
    const retryDelay = 200;
    const cookie = settingState.setting['common.wy_cookie'];
    if (!cookie) return Promise.reject(new Error('未设置Cookie'));

    const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1];
    const action = isSub ? 'subscribe' : 'unsubscribe';
    const requestObj = httpFetch(`https://music.163.com/weapi/playlist/${action}`, {
      method: 'post',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi({
        id,
        csrf_token: csrfToken || '',
      }),
    });

    try {
      const { body, statusCode } = await requestObj.promise;
      if (statusCode !== 200 || body.code !== 200) {
        throw new Error((body && body.message) || '操作失败');
      }
      return body;
    } catch (error) {
      if (retryNum < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.subPlaylist(id, isSub, retryNum + 1);
      } else {
        throw error;
      }
    }
  },

  async scrobble(songId, sourceId, duration, retryNum = 0) {
    const maxRetries = 3;
    const retryDelay = 500;

    const cookie = settingState.setting['common.wy_cookie'];
    if (!cookie) return Promise.reject(new Error('未设置Cookie'));
    const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1];
    const payload = {
      logs: JSON.stringify([{
        action: 'play',
        json: {
          id: songId,
          download: 0,
          type: 'song',
          sourceId: String(sourceId), // 歌单或专辑 id
          time: Math.floor(duration), // 播放时长（秒）
          end: 'playend',
          wifi: 0,
        },
      }]),
    }

    const requestObj = httpFetch('https://music.163.com/weapi/feedback/weblog', {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi({
        ...payload,
        csrf_token: csrfToken || '',
      }),
    })

    try {
      const { body, statusCode } = await requestObj.promise;
      if (statusCode !== 200 || body.code !== 200) {
        throw new Error((body && body.message) || '歌曲打点失败');
      }
      console.log('歌曲打点成功:', songId);
      return body;
    } catch (error) {
      console.error(`歌曲打点失败 (尝试 ${retryNum + 1}/${maxRetries}):`, error);
      if (retryNum < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.scrobble(songId, sourceId, duration, retryNum + 1);
      } else {
        console.error('歌曲打点失败 (已达最大重试次数)', error);
        throw error;
      }
    }
  },
}
