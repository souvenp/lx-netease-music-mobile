import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { View } from 'react-native';
import PageContent from '@/components/PageContent';
import Header from './Header';
import SongList from './SongList';
import wyApi from '@/utils/musicSdk/wy/artist';
import { toast } from '@/utils/tools';
import {setComponentId, updateSetting} from '@/core/common';
import PlayerBar from '@/components/player/PlayerBar';
import { createStyle } from '@/utils/tools';
import { getArtistCache, setArtistCache,
  clearArtistCache, getArtistDetailCache, setArtistDetailCache } from '@/core/cache';
import {useSettingValue} from "@/store/setting/hook.ts";
import playerState from '@/store/player/state'
import listState from '@/store/list/state'
import { LIST_IDS } from '@/config/constant'
import { type OnlineListType } from '@/components/OnlineList'
import {usePlayerMusicInfo} from "@/store/player/hook.ts";

const SONG_LIMIT = 100;
const ALBUM_LIMIT = 100;

export default memo(({ componentId, artistInfo }: { componentId: string, artistInfo: { id: string, name: string } }) => {
  const [artistDetail, setArtistDetail] = useState(null);
  const [songs, setSongs] = useState({ list: [], hasMore: true, page: 1, loading: false, sort: 'hot' });
  const [albums, setAlbums] = useState({ list: [], hasMore: true, page: 1, loading: false });
  const [activeTab, setActiveTab] = useState('songs');
  const albumViewMode = useSettingValue('artistDetail.albumViewMode')
  const componentIdRef = useRef(componentId)
  const songListRef = useRef<any>(null)
  const pendingScrollInfoRef = useRef<LX.Music.MusicInfoOnline | null>(null)
  const isFirstSortEffect = useRef(true)
  const playerMusicInfo = usePlayerMusicInfo()

  const handleSongListUpdate = useCallback((newList: LX.Music.MusicInfoOnline[]) => {
    setSongs(prev => ({
      ...prev,
      list: newList,
    }))
  }, [])



  useEffect(() => {
    const handleJumpPosition = () => {
      let listId = playerState.playMusicInfo.listId
      if (listId === LIST_IDS.TEMP) listId = listState.tempListMeta.id
      if (listId !== `artist_detail_${artistInfo.id}`) return

      const musicInfo = playerState.playMusicInfo.musicInfo as LX.Music.MusicInfoOnline
      if (musicInfo) {
        if (songs.list.length) {
          songListRef.current?.scrollToInfo(musicInfo)
        } else {
          pendingScrollInfoRef.current = musicInfo
        }
      }
    }

    global.app_event.on('jumpListPosition', handleJumpPosition)
    return () => {
      global.app_event.off('jumpListPosition', handleJumpPosition)
    }
  }, [artistInfo.id, songs.list])
  useEffect(() => {
    if (pendingScrollInfoRef.current && songs.list.length) {
      setTimeout(() => {
        if (songListRef.current) {
          songListRef.current.scrollToInfo(pendingScrollInfoRef.current);
          pendingScrollInfoRef.current = null;
        }
      }, 300);
    };
  }, [songs.list])

  useEffect(() => {
    setComponentId('ARTIST_DETAIL', componentId);
    componentIdRef.current = componentId;

    const cachedDetail = getArtistDetailCache(artistInfo.id);
    if (cachedDetail) {
      setArtistDetail(cachedDetail);
    } else {
      wyApi.getDetail(artistInfo.id).then(data => {
        setArtistDetailCache(artistInfo.id, data); // 存入缓存
        setArtistDetail(data);
      }).catch(() => toast('获取歌手信息失败'));
    }
  }, [componentId, artistInfo.id]);

  const loadSongs = useCallback((sort, page, isRefresh = false) => {
    const cacheKey = `${artistInfo.id}_songs_${sort}_${page}`;

    // 从全局缓存读取
    const cachedData = getArtistCache(cacheKey);
    if (!isRefresh && cachedData) {
      setSongs(p => ({
        ...p,
        list: page === 1 ? cachedData.list : [...p.list, ...cachedData.list],
        hasMore: cachedData.hasMore,
        page: page + 1,
        loading: false,
        sort,
      }));
      return;
    }

    setSongs(prev => {
      if (!isRefresh && (prev.loading || !prev.hasMore)) return prev;
      const offset = (page - 1) * SONG_LIMIT;
      wyApi.getSongs(artistInfo.id, sort, SONG_LIMIT, offset).then(data => {
        // 写入全局缓存
        setArtistCache(cacheKey, { list: data.list, hasMore: data.hasMore });

        setSongs(p => ({
          ...p,
          list: page === 1 ? data.list : [...p.list, ...data.list],
          hasMore: data.hasMore,
          page: page + 1,
          loading: false,
          sort,
        }));
      }).catch(() => {
        toast('获取歌曲失败');
        setSongs(p => ({ ...p, loading: false }));
      });
      return { ...prev, loading: true };
    });
  }, [artistInfo.id]);

  const loadAlbums = useCallback((page, isRefresh = false) => {
    const cacheKey = `${artistInfo.id}_albums_${page}`;

    // 从全局缓存读取
    const cachedData = getArtistCache(cacheKey);
    if (!isRefresh && cachedData) {
      setAlbums(p => ({
        ...p,
        list: page === 1 ? cachedData.hotAlbums : [...p.list, ...cachedData.hotAlbums],
        hasMore: cachedData.hasMore,
        page: page + 1,
        loading: false,
      }));
      return;
    }

    setAlbums(prev => {
      if (!isRefresh && (prev.loading || !prev.hasMore)) return prev;
      const offset = (page - 1) * ALBUM_LIMIT;
      wyApi.getAlbums(artistInfo.id, ALBUM_LIMIT, offset).then(data => {
        // 写入全局缓存
        setArtistCache(cacheKey, { hotAlbums: data.hotAlbums, hasMore: data.hasMore });

        setAlbums(p => ({
          ...p,
          list: page === 1 ? data.hotAlbums : [...p.list, ...data.hotAlbums],
          hasMore: data.hasMore,
          page: page + 1,
          loading: false,
        }));
      }).catch(() => {
        toast('获取专辑失败');
        setAlbums(p => ({ ...p, loading: false }));
      });
      return { ...prev, loading: true };
    });
  }, [artistInfo.id]);


  useEffect(() => {
    if (activeTab === 'songs') {
      if (songs.list.length === 0) loadSongs(songs.sort, 1, false); // 首次加载使用缓存
    } else {
      if (albums.list.length === 0) loadAlbums(1, false); // 首次加载使用缓存
    }
  }, [activeTab, artistInfo.id]);

  useEffect(() => {
    if (isFirstSortEffect.current) {
      isFirstSortEffect.current = false;
      return;
    }
    setSongs(prev => ({ ...prev, page: 1, list: [], hasMore: true }));
    loadSongs(songs.sort, 1, true);
  }, [songs.sort]);

  const handleLoadMoreSongs = () => {
    loadSongs(songs.sort, songs.page);
  };

  const handleLoadMoreAlbums = () => {
    loadAlbums(albums.page);
  };

  // 调用全局缓存清理
  const handleSortChange = (newSort) => {
    if (songs.sort === newSort) return;
    clearArtistCache(artistInfo.id); // 清理该歌手所有缓存
    setSongs(prev => ({ ...prev, sort: newSort, list: [], page: 1, hasMore: true }));
  };

  const handleTabChange = (newTab) => {
    if (activeTab === newTab) return;
    setActiveTab(newTab);
  };

  const handleRefresh = useCallback(() => {
    clearArtistCache(artistInfo.id);

    wyApi.getDetail(artistInfo.id).then(data => {
      setArtistDetailCache(artistInfo.id, data);
      setArtistDetail(data);
    }).catch(() => toast('刷新歌手信息失败'));

    if (activeTab === 'songs') {
      setSongs(prev => ({ ...prev, page: 1, list: [], hasMore: true }));
      loadSongs(songs.sort, 1, true);
    } else {
      setAlbums(prev => ({ ...prev, page: 1, list: [], hasMore: true }));
      loadAlbums(1, true);
    }
  }, [artistInfo.id, songs.sort, loadSongs, activeTab, loadAlbums]);


  const handleAlbumViewModeChange = useCallback((mode: 'grid' | 'list') => {
    updateSetting({ 'artistDetail.albumViewMode': mode })
  }, [])

  const displayArtist = artistDetail?.artist || artistInfo
  return (
    <PageContent>
      <View style={styles.container}>
        <Header artist={displayArtist} componentId={componentIdRef.current} />
        <SongList
          componentId={componentId}
          songs={songs}
          albums={albums}
          activeTab={activeTab}
          ref={songListRef as any}
          artistId={artistInfo.id}
          albumViewMode={albumViewMode}
          onTabChange={handleTabChange}
          onLoadMoreSongs={handleLoadMoreSongs}
          onLoadMoreAlbums={handleLoadMoreAlbums}
          onSortChange={handleSortChange}
          onRefresh={handleRefresh}
          onAlbumViewModeChange={handleAlbumViewModeChange}
          onSongListUpdate={handleSongListUpdate}
          playingId={playerMusicInfo.id}
        />
        <PlayerBar componentId={componentId} />
      </View>
    </PageContent>
  );
});

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
})
