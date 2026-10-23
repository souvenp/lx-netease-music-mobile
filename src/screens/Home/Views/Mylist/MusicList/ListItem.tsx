import { memo, useRef } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
import { Icon } from '@/components/common/Icon'
import { createStyle, type RowInfo } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useAssertApiSupport } from '@/store/common/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import Text from '@/components/common/Text'
import Badge, { type BadgeType } from '@/components/common/Badge'
import Image from '@/components/common/Image'
import PlayingIcon from '@/components/common/PlayingIcon'
import { useI18n } from '@/lang'

export const ITEM_HEIGHT = scaleSizeH(LIST_ITEM_HEIGHT)

const useQualityTag = (musicInfo: LX.Music.MusicInfo) => {
  const t = useI18n()
  let info: { type: BadgeType | null; text: string } = { type: null, text: '' }
  // 本地歌曲不读取在线音质字段，保持 Hook 调用顺序一致。
  if (musicInfo.source === 'local') return info
  if (musicInfo.meta._qualitys.hires) {
    info.type = 'secondary'
    info.text = t('quality_lossless_24bit')
  } else if (musicInfo.meta._qualitys.flac) {
    info.type = 'sq'
    info.text = t('quality_lossless')
  } else if (musicInfo.meta._qualitys['320k']) {
    info.type = 'hq'
    info.text = t('quality_high_quality')
  }
  return info
}

export default memo(
  ({
    item,
    index,
    activeIndex,
    onPress,
    onShowMenu,
    onLongPress,
    selectedList,
    rowInfo,
    isShowAlbumName,
    isShowInterval,
    showCover,
    hideMenu = false,
    showSource = true,
    qualityTag,
  }: {
    item: LX.Music.MusicInfo
    index: number
    activeIndex: number
    onPress: (item: LX.Music.MusicInfo, index: number) => void
    onLongPress?: (item: LX.Music.MusicInfo, index: number) => void
    onShowMenu?: (
      item: LX.Music.MusicInfo,
      index: number,
      position: { x: number; y: number; w: number; h: number }
    ) => void
    selectedList: LX.Music.MusicInfo[]
    rowInfo: RowInfo
    isShowAlbumName: boolean
    isShowInterval: boolean
    showCover: boolean
    // 本地音乐复用歌单行，只展示音质并隐藏操作入口。
    hideMenu?: boolean
    showSource?: boolean
    qualityTag?: { type: BadgeType, text: string }
  }) => {
    const theme = useTheme()
    const isSelected = selectedList.includes(item)
    const selectedBackground = theme.isDark
      ? theme['c-primary-alpha-600']
      : theme['c-primary-background-active']
    const isSupported = useAssertApiSupport(item.source)
    const moreButtonRef = useRef<TouchableOpacity>(null)

    // 优先使用本地文件解析的音质，在线歌曲沿用原有标签。
    const onlineTag = useQualityTag(item)
    const tagInfo = qualityTag ?? onlineTag

    const handleShowMenu = () => {
      if (moreButtonRef.current?.measure) {
        moreButtonRef.current.measure((fx, fy, width, height, px, py) => {
          onShowMenu?.(item, index, {
            x: Math.ceil(px),
            y: Math.ceil(py),
            w: Math.ceil(width),
            h: Math.ceil(height),
          })
        })
      }
    }

    const active = activeIndex == index
    const singer = `${item.singer}${isShowAlbumName && item.meta.albumName ? `·${item.meta.albumName}` : ''}`

    return (
      <View
        style={{
          ...styles.listItem,
          // 隐藏更多按钮后保留其 38px 占位，让时长与其他歌单对齐而不贴右边。
          paddingRight: hideMenu ? 40 : 2,
          width: rowInfo.rowWidth,
          height: ITEM_HEIGHT,
          backgroundColor: isSelected ? selectedBackground : 'rgba(0,0,0,0)',
          opacity: isSupported ? 1 : 0.5,
        }}
      >
        <TouchableOpacity
          style={styles.listItemLeft}
          onPress={() => {
            onPress(item, index)
          }}
          onLongPress={() => {
            onLongPress?.(item, index)
          }}
        >



          <View style={showCover ? styles.sn : styles.snIndex}>
            {showCover ? (
              <Image url={item.meta.picUrl} style={styles.albumArt} />
            ) : active ? (
              <PlayingIcon />
            ) : (
              <Text color={theme['c-font']} size={12}>
                {index + 1}
              </Text>
            )}
          </View>
          <View style={styles.itemInfo}>
            {/* <View style={styles.listItemTitle}> */}
            <Text color={active ? theme['c-primary-font'] : theme['c-font']} numberOfLines={1}>
              {item.name}
              {item.alias ? <Text color={theme['c-font-label']}> ({item.alias})</Text> : null}
            </Text>
            {/* </View> */}
            <View style={styles.listItemSingle}>
              {showSource ? <Badge>{item.source.toUpperCase()}</Badge> : null}
              {tagInfo.type ? <Badge type={tagInfo.type}>{tagInfo.text}</Badge> : null}
              {item.source !== 'local' && (item as LX.Music.MusicInfoOnline).meta.fee === 1 ? <Badge type="vip">VIP</Badge> : null}
              {item.source === 'wy' && (item as LX.Music.MusicInfoOnline).meta.originCoverType === 2 ? <Badge type="normal">cover</Badge> : null}
              <Text
                style={styles.listItemSingleText}
                size={11}
                color={active ? theme['c-primary-alpha-200'] : theme['c-500']}
                numberOfLines={1}
              >
                {singer}
              </Text>
            </View>
          </View>
          {isShowInterval ? (
            <Text
              size={11}
              color={active ? theme['c-primary-alpha-400'] : theme['c-250']}
              numberOfLines={1}
            >
              {item.interval}
            </Text>
          ) : null}
        </TouchableOpacity>
        {/* <View style={styles.listItemRight}> */}
        {!hideMenu && <TouchableOpacity onPress={handleShowMenu} ref={moreButtonRef} style={styles.moreButton}>
          <Icon name="dots-vertical" style={{ color: theme['c-350'] }} size={12} />
        </TouchableOpacity>}
        {/* </View> */}
      </View>
    )
  },
  (prevProps, nextProps) => {
    return !!(
      prevProps.item === nextProps.item &&
      prevProps.hideMenu === nextProps.hideMenu &&
      prevProps.showSource === nextProps.showSource &&
      prevProps.qualityTag === nextProps.qualityTag &&
      prevProps.onPress === nextProps.onPress &&
      prevProps.index === nextProps.index &&
      prevProps.isShowAlbumName === nextProps.isShowAlbumName &&
      prevProps.isShowInterval === nextProps.isShowInterval &&
      prevProps.activeIndex != nextProps.index &&
      nextProps.activeIndex != nextProps.index &&
      nextProps.selectedList.includes(nextProps.item) ==
      prevProps.selectedList.includes(nextProps.item) &&
      prevProps.showCover === nextProps.showCover
    )
  }
)

const styles = createStyle({
  listItem: {
    // width: '50%',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    // paddingLeft: 10,
    paddingRight: 2,
    alignItems: 'center',
    // borderBottomWidth: BorderWidths.normal,
  },
  listItemLeft: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sn: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 5,
    paddingRight: 5,
  },
  snIndex: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 5,
    paddingRight: 5,
  },
  albumArt: {
    width: 52,
    height: 52,
    borderRadius: 4,
  },
  itemInfo: {
    flexGrow: 1,
    flexShrink: 1,
    // paddingTop: 10,
    // paddingBottom: 10,
    paddingRight: 2,
  },
  // listItemTitle: {
  //   flexGrow: 0,
  //   flexShrink: 1,
  // },
  listItemSingle: {
    paddingTop: 3,
    flexDirection: 'row',
    // alignItems: 'flex-end',
  },
  listItemSingleText: {
    // backgroundColor: 'rgba(0,0,0,0.2)',
    flexGrow: 0,
    flexShrink: 1,
    fontWeight: '300',
    // fontSize: 15,
  },
  // listItemBadge: {
  //   // fontSize: 10,
  //   paddingLeft: 5,
  //   paddingTop: 2,
  //   alignSelf: 'flex-start',
  // },
  listItemRight: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    justifyContent: 'center',
  },

  moreButton: {
    height: '80%',
    paddingLeft: 10,
    paddingRight: 16,
    // paddingTop: 10,
    // paddingBottom: 10,
    // backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
  },
})
