import { memo, useState, useCallback } from 'react'
import {View, FlatList, RefreshControl, Keyboard} from 'react-native'
import ListItem from './ListItem'
import { useWyFollowedArtists } from '@/store/user/hook.ts'
import wyApi from '@/utils/musicSdk/wy/user'
import { setWyFollowedArtists } from '@/store/user/action'
import { toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'

export default memo(() => {
  const followedArtists = useWyFollowedArtists()
  const [loading, setLoading] = useState(false)
  const theme = useTheme()
  const onRefresh = useCallback(() => {
    setLoading(true)
    wyApi.getSublist(100, 0)
      .then(artists => {
        setWyFollowedArtists(artists)
      })
      .catch(err => {
        toast(`刷新失败: ${err.message}`)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        onScrollBeginDrag={Keyboard.dismiss}
        data={followedArtists}
        renderItem={({ item }) => <ListItem artist={item} />}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl
            colors={[theme['c-primary']]}
            refreshing={loading}
            onRefresh={onRefresh}
          />
        }
      />
    </View>
  )
})
