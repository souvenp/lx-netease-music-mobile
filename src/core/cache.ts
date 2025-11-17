const artistDataCache = new Map<string, any>()
const artistDetailCache = new Map<string, any>()
let dailyRecSongsCache: LX.Music.MusicInfoOnline[] | null = null
let dailyRecPlaylistsCache: any[] | null = null

/**
 * 获取歌手页面的列表缓存数据
 * @param key 缓存键
 */
export const getArtistCache = (key: string) => {
  return artistDataCache.get(key);
};

/**
 * 设置歌手页面的列表缓存数据
 * @param key 缓存键
 * @param data 要缓存的数据
 */
export const setArtistCache = (key: string, data: any) => {
  artistDataCache.set(key, data);
};

/**
 * 获取歌手详情的缓存
 * @param artistId 歌手ID
 */
export const getArtistDetailCache = (artistId: string) => {
  return artistDetailCache.get(artistId);
};

/**
 * 设置歌手详情的缓存
 * @param artistId 歌手ID
 * @param data 歌手详情数据
 */
export const setArtistDetailCache = (artistId: string, data: any) => {
  artistDetailCache.set(artistId, data);
};


/**
 * 清除指定歌手的所有相关缓存（歌曲、专辑、详情）
 * @param artistId 歌手ID
 */
export const clearArtistCache = (artistId: string) => {
  const songKeyPrefix = `${artistId}_songs_`;
  const albumKeyPrefix = `${artistId}_albums_`;
  for (const key of artistDataCache.keys()) {
    if (key.startsWith(songKeyPrefix) || key.startsWith(albumKeyPrefix)) {
      artistDataCache.delete(key);
    }
  }
  artistDetailCache.delete(artistId);
};

export const getDailyRecSongsCache = (): LX.Music.MusicInfoOnline[] | null => {
  return dailyRecSongsCache;
};

export const setDailyRecSongsCache = (data: LX.Music.MusicInfoOnline[]) => {
  dailyRecSongsCache = data;
};

export const clearDailyRecSongsCache = () => {
  dailyRecSongsCache = null;
};

export const getDailyRecPlaylistsCache = (): any[] | null => {
  return dailyRecPlaylistsCache;
};

export const setDailyRecPlaylistsCache = (data: any[]) => {
  dailyRecPlaylistsCache = data;
};

export const clearDailyRecPlaylistsCache = () => {
  dailyRecPlaylistsCache = null;
};
