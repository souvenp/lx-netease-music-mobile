import { memo, useMemo } from 'react'
import { FlatList, View, RefreshControl } from 'react-native'
import AlbumListItem from './AlbumListItem'
import { useLayout } from '@/utils/hooks'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { scaleSizeW } from '@/utils/pixelRatio'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'

const MIN_WIDTH = scaleSizeW(120);
const HORIZONTAL_SPACING = 24;

export default memo(({ albums, loading, hasMore, onLoadMore, onRefresh, ListHeaderComponent, viewMode }) => {
  const { onLayout, width } = useLayout()
  const theme = useTheme()
  const t = useI18n()

  const rowInfo = useMemo(() => {
    if (width === 0) return { num: 3, itemWidth: 0 }
    if (viewMode === 'list') return { num: 1, itemWidth: width }
    const num = Math.max(Math.floor((width + HORIZONTAL_SPACING) / (MIN_WIDTH + HORIZONTAL_SPACING)), 3)
    const totalSpacing = HORIZONTAL_SPACING * (num - 1)
    const itemWidth = Math.floor((width - totalSpacing) / num)
    return { num, itemWidth }
  }, [width, viewMode])

  const renderItem = ({ item }: { item: any }) => {
    if (item.id.toString().startsWith('white__')) {
      return <View style={{ width: rowInfo.itemWidth }} />
    }
    return <AlbumListItem item={item} width={rowInfo.itemWidth} viewMode={viewMode} />
  }

  const list = useMemo(() => {
    const list = [...albums]
    if (viewMode === 'list') return list
    if (rowInfo.num === 0) return list // Avoid division by zero
    let whiteItemNum = list.length % rowInfo.num
    if (whiteItemNum > 0) whiteItemNum = rowInfo.num - whiteItemNum
    for (let i = 0; i < whiteItemNum; i++) {
      list.push({ id: `white__${i}` })
    }
    return list
  }, [albums, rowInfo.num, viewMode])

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
          key={String(rowInfo.num) + viewMode}
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
          columnWrapperStyle={viewMode === 'grid' ? styles.row : undefined}
        />
      )}
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    paddingHorizontal: 8,
  },
  row: {
    justifyContent: 'space-between',
  },
  footer: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
})
