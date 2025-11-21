import {forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef} from 'react'
import { View, TouchableOpacity } from 'react-native'
import OnlineList from '@/components/OnlineList'
import AlbumList from './AlbumList'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { playOnlineList } from '@/core/list'
import { BorderWidths } from '@/theme'
import { Icon } from '@/components/common/Icon.tsx'
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view'
import { type OnlineListType } from '@/components/OnlineList'

interface SongListProps {
  componentId: string
  artistId: string
  songs: { list: any[], hasMore: boolean, page: number, loading: boolean, sort: string }
  albums: { list: any[], hasMore: boolean, page: number, loading: boolean }
  activeTab: 'songs' | 'albums'
  albumViewMode: 'grid' | 'list'
  playingId: string | null
  onTabChange: (tab: 'songs' | 'albums') => void
  onLoadMoreSongs: () => void
  onLoadMoreAlbums: () => void
  onSortChange: (sort: 'hot' | 'time') => void
  onRefresh: () => void
  onAlbumViewModeChange: (mode: 'grid' | 'list') => void
  onSongListUpdate: (list: LX.Music.MusicInfoOnline[]) => void
}

interface SongListRef {
  scrollToInfo: (info: LX.Music.MusicInfoOnline) => void
}

const SongList = forwardRef<SongListRef, SongListProps>(({
                                                           componentId,
                                                           artistId,
                                                           songs, albums, activeTab, onTabChange,
                                                           onLoadMoreSongs, onLoadMoreAlbums,
                                                           onSortChange, onRefresh,
                                                           playingId,
                                                           albumViewMode, onAlbumViewModeChange,
                                                           onSongListUpdate,
                                                         }, ref) => {
  const theme = useTheme()
  const songListRef = useRef<OnlineListType>(null)
  const pagerViewRef = useRef<PagerView>(null)

  useImperativeHandle(ref, () => ({
    scrollToInfo: (info) => {
      songListRef.current?.scrollToInfo(info)
    },
  }))

  const onPlayList = useCallback((index: number) => {
    if (!songs.list.length) return
    const listId = `artist_detail_${artistId}`
    void playOnlineList(listId, songs.list, index)
  }, [songs.list, artistId])

  useEffect(() => {
    const pageIndex = activeTab === 'songs' ? 0 : 1
    pagerViewRef.current?.setPage(pageIndex)
  }, [activeTab])

  const onPageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const newTab = event.nativeEvent.position === 0 ? 'songs' : 'albums'
    if (newTab !== activeTab) {
      onTabChange(newTab)
    }
  }, [activeTab, onTabChange])


  useEffect(() => {
    if (activeTab === 'songs') {
      if (songs.loading && songs.list.length === 0) {
        songListRef.current?.setStatus('loading')
      } else {
        songListRef.current?.setStatus(songs.hasMore ? 'idle' : 'end')
      }
      songListRef.current?.setList(songs.list, songs.page > 1, false)
    }
  }, [songs.list, songs.loading, songs.hasMore, songs.page, activeTab])

  const Header = () => (
    <View style={styles.listHeader}>
      <View style={styles.tabs}>
        <TouchableOpacity style={styles.tab} onPress={() => onTabChange('songs')}>
          <Text
            style={[styles.tabText, { borderBottomColor: activeTab === 'songs' ? theme['c-primary-font-active'] : 'transparent' }]}
            color={activeTab === 'songs' ? theme['c-primary-font'] : theme['c-font']}
          >
            所有歌曲
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => onTabChange('albums')}>
          <Text
            style={[styles.tabText, { borderBottomColor: activeTab === 'albums' ? theme['c-primary-font-active'] : 'transparent' }]}
            color={activeTab === 'albums' ? theme['c-primary-font'] : theme['c-font']}
          >
            所有专辑
          </Text>
        </TouchableOpacity>
      </View>
      { activeTab === 'songs' && (
        <View style={styles.sorts}>
          <TouchableOpacity onPress={() => onSortChange('hot')} style={styles.sortBtn}>
            <Text
              style={[styles.tabText, { borderBottomColor: songs.sort === 'hot' ? theme['c-primary-font-active'] : 'transparent' }]}
              color={songs.sort === 'hot' ? theme['c-primary-font'] : theme['c-font']}
            >
              热门
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onSortChange('time')} style={styles.sortBtn}>
            <Text
              style={[styles.tabText, { borderBottomColor: songs.sort === 'time' ? theme['c-primary-font-active'] : 'transparent' }]}
              color={songs.sort === 'time' ? theme['c-primary-font'] : theme['c-font']}
            >
              时间
            </Text>
          </TouchableOpacity>
        </View>
      )}
      { activeTab === 'albums' && (
        <View style={styles.viewModeContainer}>
          <TouchableOpacity style={styles.viewModeBtn} onPress={() => onAlbumViewModeChange('grid')}>
            <Icon name="album" color={albumViewMode === 'grid' ? theme['c-primary-font-active'] : theme['c-font']} size={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.viewModeBtn} onPress={() => onAlbumViewModeChange('list')}>
            <Icon name="menu" color={albumViewMode === 'list' ? theme['c-primary-font-active'] : theme['c-font']} size={18} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )

  return (
    <View style={{ flex: 1 }}>
      <Header />
      <PagerView
        ref={pagerViewRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={onPageSelected}
      >
        <View key="1" style={{ flex: 1 }}>
          <OnlineList
            ref={songListRef}
            listId="search"
            forcePlayList={true}
            onPlayList={onPlayList}
            onRefresh={onRefresh}
            onLoadMore={onLoadMoreSongs}
            onListUpdate={onSongListUpdate}
            playingId={playingId}
          />
        </View>
        <View key="2" style={{ flex: 1 }}>
          <AlbumList
            componentId={componentId}
            albums={albums.list}
            loading={albums.loading}
            hasMore={albums.hasMore}
            onRefresh={onRefresh}
            viewMode={albumViewMode}
            onLoadMore={onLoadMoreAlbums}
          />
        </View>
      </PagerView>
    </View>
  )
})

export default memo(SongList)

const styles = createStyle({
  listHeader: {
    paddingHorizontal: 15,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    paddingVertical: 8,
    paddingRight: 15,
  },
  viewModeContainer: {
    flexDirection: 'row',
  },
  viewModeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sorts: {
    flexDirection: 'row',
  },
  sortBtn: {
    paddingVertical: 8,
    paddingLeft: 15,
  },
  tabText: {
    paddingBottom: 3,
    borderBottomWidth: BorderWidths.normal3,
  },
})
