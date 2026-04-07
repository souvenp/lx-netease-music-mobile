import { memo, useState, useCallback } from 'react'
import {View, FlatList, RefreshControl, Keyboard} from 'react-native'
import ListItem from './ListItem'
import { useWyFollowedArtists } from '@/store/user/hook.ts'
import wyApi from '@/utils/musicSdk/wy/user'
import { setWyFollowedArtists } from '@/store/user/action'
import { createStyle, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useHorizontalMode } from '@/utils/hooks'

export default memo(() => {
  const followedArtists = useWyFollowedArtists()
  const [loading, setLoading] = useState(false)
  const theme = useTheme()
  const isHorizontal = useHorizontalMode()
  const onRefresh = useCallback(() => {
    setLoading(true)
    wyApi.getAllSublist()
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
        key={isHorizontal ? 'horizontal' : 'vertical'}
        numColumns={isHorizontal ? 2 : 1}
        renderItem={({ item }) => (
          <View style={isHorizontal ? styles.itemWrapper : null}>
            <ListItem artist={item} />
          </View>
        )}
        keyExtractor={item => String(item.id)}
        columnWrapperStyle={isHorizontal ? styles.columnWrapper : undefined}
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

const styles = createStyle({
  columnWrapper: {
    paddingHorizontal: 8,
  },
  itemWrapper: {
    flex: 1,
    maxWidth: '50%',
  },
})
