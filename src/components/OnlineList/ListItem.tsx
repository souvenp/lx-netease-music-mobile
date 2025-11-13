import { memo, useRef } from 'react'
import { View, TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import Badge, { type BadgeType } from '@/components/common/Badge'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
import { createStyle, type RowInfo } from '@/utils/tools'
import Image from '@/components/common/Image'
import { useIsWyLiked } from '@/store/user/hook'
import { handleLikeMusic } from './listAction'

export const ITEM_HEIGHT = scaleSizeH(LIST_ITEM_HEIGHT)

const useQualityTag = (musicInfo: LX.Music.MusicInfoOnline) => {
  const t = useI18n()
  let info: { type: BadgeType | null; text: string } = { type: null, text: '' }
  // if (musicInfo.meta._qualitys.master) {
  //   info.type = 'secondary'
  //   info.text = t('quality_lossless_master')
  // } else if (musicInfo.meta._qualitys.atmos_plus) {
  //   info.type = 'secondary'
  //   info.text = t('quality_lossless_atmos_plus')
  // } else if (musicInfo.meta._qualitys.atmos) {
  //   info.type = 'secondary'
  //   info.text = t('quality_lossless_atmos')
  // } else
    if (musicInfo.meta._qualitys.hires) {
    info.type = 'secondary'
    info.text = t('quality_lossless_24bit')
  } else if (musicInfo.meta._qualitys.flac) {
    // info.type = 'secondary'
    info.type = 'sq'
    info.text = t('quality_lossless')
  } else if (musicInfo.meta._qualitys['320k']) {
    info.type = 'tertiary'
    info.text = t('quality_high_quality')
  }

  return info
}

export default memo(
  ({
     item,
     index,
     showSource,
     onPress,
     onLongPress,
     onShowMenu,
     selectedList,
     rowInfo,
     isShowAlbumName,
     playingId,
     isShowInterval,
     listId,
     showCover = true,
   }: {
    item: LX.Music.MusicInfoOnline
    index: number
    showSource?: boolean
    onPress: (item: LX.Music.MusicInfoOnline, index: number) => void
    onLongPress: (item: LX.Music.MusicInfoOnline, index: number) => void
    onShowMenu: (
      item: LX.Music.MusicInfoOnline,
      index: number,
      position: { x: number; y: number; w: number; h: number }
    ) => void
    selectedList: LX.Music.MusicInfoOnline[]
    rowInfo: RowInfo
    isShowAlbumName: boolean
    isShowInterval: boolean
    playingId?: string | null;
    listId?: string
    showCover?: boolean
  }) => {
    const theme = useTheme()
    const isPlaying = playingId === item.id;
    const isSelected = selectedList.includes(item)
    const isLiked = useIsWyLiked(item.meta.songId)

    const moreButtonRef = useRef<TouchableOpacity>(null)
    const handleShowMenu = () => {
      if (moreButtonRef.current?.measure) {
        moreButtonRef.current.measure((fx, fy, width, height, px, py) => {
          onShowMenu(item, index, {
            x: Math.ceil(px),
            y: Math.ceil(py),
            w: Math.ceil(width),
            h: Math.ceil(height),
          })
        })
      }
    }

    const showLikeButton = item.source === 'wy'

    const handleLike = () => {
      handleLikeMusic(item)
    }

    const tagInfo = useQualityTag(item)
    const singer = `${item.singer}${isShowAlbumName && item.meta.albumName ? `·${item.meta.albumName}` : ''}`

    return (
      <View
        style={{
          ...styles.listItem,
          width: rowInfo.rowWidth,
          height: ITEM_HEIGHT,
          backgroundColor: isPlaying || isSelected ? theme['c-primary-background-hover'] : 'rgba(0,0,0,0)',        }}
      >
        <TouchableOpacity
          style={styles.listItemLeft}
          onPress={() => {
            onPress(item, index)
          }}
          onLongPress={() => {
            onLongPress(item, index)
          }}
        >


          <View style={showCover ? styles.sn : styles.snIndex}>
            {showCover ? (
              <Image url={item.meta.picUrl} style={styles.albumArt} />
            ) : (
              <Text color={isPlaying ? theme['c-primary-font'] : theme['c-font']} size={12}>
                {index + 1}
              </Text>
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text numberOfLines={1} color={isPlaying ? theme['c-primary-font'] : theme['c-font']}>
              {item.name}
              {item.alias ? <Text color={theme['c-font-label']}> ({item.alias})</Text> : null}
            </Text>
            <View style={styles.listItemSingle}>
              {showSource ? <Badge type="tertiary">{item.source.toUpperCase()}</Badge> : null}
              {tagInfo.type ? <Badge type={tagInfo.type}>{tagInfo.text}</Badge> : null}
              {item.meta.fee === 1 ? <Badge type="vip">VIP</Badge> : null}
              {item.source === 'wy' && item.meta.originCoverType === 2 ? <Badge type="normal">cover</Badge> : null}
              <Text
                style={styles.listItemSingleText}
                size={11}
                color={isPlaying ? theme['c-primary-alpha-200'] : theme['c-500']}
                numberOfLines={1}
              >
                {singer}
              </Text>
            </View>
          </View>
          {isShowInterval ? (
            <Text size={11} color={isPlaying ? theme['c-primary-alpha-200'] : theme['c-500']} numberOfLines={1}>
              {item.interval}
            </Text>
          ) : null}
        </TouchableOpacity>

        {showLikeButton ? (
          <TouchableOpacity onPress={handleLike} style={styles.likeButton}>
            <Icon name={isLiked ? "love-filled" : "love"} size={16} color={isLiked ? theme['c-liked'] : theme['c-350']} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity onPress={handleShowMenu} ref={moreButtonRef} style={styles.moreButton}>
          <Icon name="dots-vertical" style={{ color: theme['c-350'] }} size={12} />
        </TouchableOpacity>
      </View>
    )
  },
  (prevProps, nextProps) => {
    return !!(
      prevProps.item === nextProps.item &&
      prevProps.index === nextProps.index &&
      prevProps.isShowAlbumName === nextProps.isShowAlbumName &&
      prevProps.isShowInterval === nextProps.isShowInterval &&
      prevProps.listId === nextProps.listId &&
      prevProps.playingId === nextProps.playingId &&
      nextProps.selectedList.includes(nextProps.item) ==
      prevProps.selectedList.includes(nextProps.item) &&
      prevProps.showCover === nextProps.showCover
    )
  }
)

const styles = createStyle({
  listItem: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingRight: 2,
    alignItems: 'center',
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
    paddingLeft: 2,
    paddingRight: 2,
  },
  listItemSingle: {
    paddingTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemTimeLabel: {
    marginRight: 5,
    fontWeight: '400',
  },
  listItemSingleText: {
    flexGrow: 0,
    flexShrink: 1,
    fontWeight: '300',
  },
  listItemBadge: {
    paddingLeft: 5,
    paddingTop: 2,
    alignSelf: 'flex-start',
  },
  listItemRight: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    justifyContent: 'center',
  },
  likeButton: {
    height: '80%',
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    height: '80%',
    paddingLeft: 10,
    paddingRight: 16,
    justifyContent: 'center',
  },
})
