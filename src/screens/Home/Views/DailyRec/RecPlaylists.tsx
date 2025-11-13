import { memo, useEffect, useState, useCallback } from 'react'
import { View, FlatList, RefreshControl, Keyboard } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'
import { toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import wyApi from '@/utils/musicSdk/wy/dailyRec'
import ListItem from '../MyPlaylist/ListItem'

export default memo(({ onOpenDetail }: { onOpenDetail: (info: any) => void }) => {
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const cookie = useSettingValue('common.wy_cookie')
  const theme = useTheme()

  const loadPlaylists = useCallback(() => {
    if (!cookie) {
      setLoading(false)
      setPlaylists([])
      return
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
            onRefresh={loadPlaylists}
          />
        }
      />
    </View>
  )
})
