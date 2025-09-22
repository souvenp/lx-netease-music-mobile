import { memo, useCallback, useEffect, useRef } from 'react'
import { View, TouchableOpacity } from 'react-native'
import OnlineList from '@/components/OnlineList'
import AlbumList from './AlbumList' // 引入新的专辑列表组件
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { playOnlineList } from '@/core/list'
import { BorderWidths } from '@/theme'

export default memo(({
                       songs, albums, activeTab, onTabChange,
                       onLoadMoreSongs, onLoadMoreAlbums,
                       onSortChange, onRefresh,
                     }) => {
  const theme = useTheme()
  const songListRef = useRef<any>(null)

  const onPlayList = useCallback((index: number) => {
    if (!songs.list.length) return
    const listId = `artist_detail_${songs.list[0]?.meta.albumId ?? 'unknown'}`
    void playOnlineList(listId, songs.list, index)
  }, [songs.list])

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
    </View>
  )


  if (activeTab === 'songs') {
    return (
      <OnlineList
        ref={songListRef}
        listId="search"
        forcePlayList={true}
        onPlayList={onPlayList}
        onRefresh={onRefresh}
        onLoadMore={onLoadMoreSongs}
        ListHeaderComponent={<Header />}
      />
    )
  }

  return (
    <AlbumList
      albums={albums.list}
      loading={albums.loading}
      hasMore={albums.hasMore}
      onRefresh={onRefresh}
      onLoadMore={onLoadMoreAlbums}
      ListHeaderComponent={<Header />}
    />
  )
})

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
