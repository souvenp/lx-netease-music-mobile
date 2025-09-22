import { memo, useMemo } from 'react'
import { FlatList, View, RefreshControl } from 'react-native'
import AlbumListItem from './AlbumListItem'
import { useLayout } from '@/utils/hooks'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { scaleSizeW } from '@/utils/pixelRatio'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'

const MIN_WIDTH = scaleSizeW(140)

export default memo(({ albums, loading, hasMore, onLoadMore, onRefresh, ListHeaderComponent }) => {
  const { onLayout, width } = useLayout()
  const theme = useTheme()
  const t = useI18n()

  const rowInfo = useMemo(() => {
    if (width === 0) return { num: 2, itemWidth: 0 }
    const num = Math.max(Math.floor(width / MIN_WIDTH), 2)
    return { num, itemWidth: width / num }
  }, [width])

  const renderItem = ({ item }) => {
    if (item.id.toString().startsWith('white__')) return <View style={{ width: rowInfo.itemWidth }} />
    return <AlbumListItem item={item} width={rowInfo.itemWidth} />
  }

  const list = useMemo(() => {
    const list = [...albums]
    if (rowInfo.num === 0) return list // Avoid division by zero
    let whiteItemNum = list.length % rowInfo.num
    if (whiteItemNum > 0) whiteItemNum = rowInfo.num - whiteItemNum
    for (let i = 0; i < whiteItemNum; i++) {
      list.push({ id: `white__${i}` })
    }
    return list
  }, [albums, rowInfo.num])

  const ListFooterComponent = () => {
    let text = ''
    if (loading && albums.length > 0) text = t('list_loading')
    else if (!hasMore) text = t('list_end')

    return (
      <View style={styles.footer}>
        <Text color={theme['c-font-label']}>{text}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      {width > 0 && (
        <FlatList
          key={String(rowInfo.num)}
          numColumns={rowInfo.num}
          data={list}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
          refreshControl={
            <RefreshControl
              colors={[theme['c-primary']]}
              refreshing={loading && albums.length === 0}
              onRefresh={onRefresh}
            />
          }
        />
      )}
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
  },
  footer: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
})
