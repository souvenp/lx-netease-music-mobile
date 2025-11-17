import { memo, useEffect, useState, useCallback } from 'react'
import { View, FlatList, RefreshControl, Keyboard } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'
import { toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import wyApi from '@/utils/musicSdk/wy/dailyRec'
import ListItem from '../MyPlaylist/ListItem'
import { getDailyRecPlaylistsCache, setDailyRecPlaylistsCache, clearDailyRecPlaylistsCache } from '@/core/cache'

export default memo(({ onOpenDetail }: { onOpenDetail: (info: any) => void }) => {
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const cookie = useSettingValue('common.wy_cookie')
  const theme = useTheme()

  const loadPlaylists = useCallback((isRefresh = false) => {
    if (!cookie) {
      setLoading(false)
      setPlaylists([])
      return
    }

    if (!isRefresh) {
      const cachedPlaylists = getDailyRecPlaylistsCache()
      if (cachedPlaylists) {
        setPlaylists(cachedPlaylists)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    wyApi.getRecPlaylists(cookie).then(list => {
      const adaptedList =  list
        .filter(item => !item.name.includes('雷达'))
        .map(item => ({
          id: item.id,
          name: item.name,
          trackCount: item.trackCount,
          coverImgUrl: item.picUrl,
          creator: { nickname: item.creator?.nickname ?? '推荐' },
          playCount: item.playcount,
          description: item.copywriter,
        }))
      setPlaylists(adaptedList)
      setDailyRecPlaylistsCache(adaptedList)
    }).catch(err => {
      toast(`获取推荐歌单失败: ${err.message}`)
    }).finally(() => {
      setLoading(false)
    })
  }, [cookie])

  useEffect(() => {
    loadPlaylists()
  }, [loadPlaylists])

  const handleItemPress = (playlistInfo: any) => {
    onOpenDetail(playlistInfo)
  }

  const handleRefresh = () => {
    clearDailyRecPlaylistsCache()
    loadPlaylists(true)
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        onScrollBeginDrag={Keyboard.dismiss}
        data={playlists}
        renderItem={({ item }) => <ListItem item={item} onPress={handleItemPress} />}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl
            colors={[theme['c-primary']]}
            refreshing={loading}
            onRefresh={handleRefresh}
          />
        }
      />
    </View>
  )
})
