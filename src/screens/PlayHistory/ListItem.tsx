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
import type { PlayHistoryRecord } from '@/utils/data'
import { useI18n } from '@/lang'

export const ITEM_HEIGHT = scaleSizeH(LIST_ITEM_HEIGHT)

const sourceLabels: Record<string, string> = {
    daily_recommend: '日推',
    search: '搜索',
    playlist: '歌单',
    artist: '歌手',
    album: '专辑',
    unknown: '未知',
}

const useQualityTag = (musicInfo: LX.Music.MusicInfoOnline) => {
    const t = useI18n()
    let info: { type: BadgeType | null; text: string } = { type: null, text: '' }
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
        record,
        index,
        activeIndex,
        onPress,
        onShowMenu,
        onLongPress,
        rowInfo,
        isShowAlbumName,
        isShowInterval,
        showCover,
    }: {
        record: PlayHistoryRecord
        index: number
        activeIndex: number
        onPress: (item: LX.Music.MusicInfo, index: number) => void
        onLongPress: (item: LX.Music.MusicInfo, index: number) => void
        onShowMenu: (
            item: LX.Music.MusicInfo,
            index: number,
            position: { x: number; y: number; w: number; h: number }
        ) => void
        rowInfo: RowInfo
        isShowAlbumName: boolean
        isShowInterval: boolean
        showCover: boolean
    }) => {
        const theme = useTheme()
        const item = record.musicInfo
        const isSupported = useAssertApiSupport(item.source)
        const moreButtonRef = useRef<TouchableOpacity>(null)

        const tagInfo = item.source === 'local' ? { type: null, text: '' } : useQualityTag(item as LX.Music.MusicInfoOnline)

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

        const active = activeIndex == index
        const singer = `${item.singer}${isShowAlbumName && item.meta.albumName ? `·${item.meta.albumName}` : ''}`

        // Render logic for platform and source context
        const showSourceBadge = item.source === 'wy' || ['search', 'playlist'].includes(record.sourceContext)

        return (
            <View
                style={{
                    ...styles.listItem,
                    width: rowInfo.rowWidth,
                    height: ITEM_HEIGHT,
                    backgroundColor: 'rgba(0,0,0,0)',
                    opacity: isSupported ? 1 : 0.5,
                }}
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
                            <>
                                <Image url={item.meta.picUrl} style={styles.albumArt} />
                                {active && (
                                    <View style={{ position: 'absolute', width: 52, height: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>
                                        <PlayingIcon />
                                    </View>
                                )}
                            </>
                        ) : active ? (
                            <PlayingIcon />
                        ) : (
                            <Text color={theme['c-font']} size={12}>
                                {index + 1}
                            </Text>
                        )}
                    </View>
                    <View style={styles.itemInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text color={active ? theme['c-primary-font'] : theme['c-font']} numberOfLines={1} style={{ flexShrink: 1 }}>
                                {item.name}
                                {item.alias ? <Text color={theme['c-font-label']}> ({item.alias})</Text> : null}
                            </Text>
                            {record.listenCount > 1 && (
                                <Text size={10} color={theme['c-primary-alpha-500']} style={{ marginLeft: 6 }}>
                                    {record.listenCount}次
                                </Text>
                            )}
                        </View>
                        <View style={styles.listItemSingle}>
                            <Badge>{record.platform.toUpperCase()}</Badge>
                            {showSourceBadge && sourceLabels[record.sourceContext] && <Badge type="secondary">{sourceLabels[record.sourceContext]}</Badge>}
                            {tagInfo.type ? <Badge type={tagInfo.type}>{tagInfo.text}</Badge> : null}
                            {item.source !== 'local' && ('fee' in item.meta && item.meta.fee === 1) ? <Badge type="vip">VIP</Badge> : null}
                            {item.source === 'wy' && ('originCoverType' in item.meta && item.meta.originCoverType === 2) ? <Badge type="normal">cover</Badge> : null}
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
                <TouchableOpacity onPress={handleShowMenu} ref={moreButtonRef} style={styles.moreButton}>
                    <Icon name="dots-vertical" style={{ color: theme['c-350'] }} size={12} />
                </TouchableOpacity>
            </View>
        )
    },
    (prevProps, nextProps) => {
        return !!(
            prevProps.record === nextProps.record &&
            prevProps.index === nextProps.index &&
            prevProps.isShowAlbumName === nextProps.isShowAlbumName &&
            prevProps.isShowInterval === nextProps.isShowInterval &&
            prevProps.activeIndex != nextProps.index &&
            nextProps.activeIndex != nextProps.index &&
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
        paddingRight: 2,
    },
    listItemSingle: {
        paddingTop: 3,
        flexDirection: 'row',
    },
    listItemSingleText: {
        flexGrow: 0,
        flexShrink: 1,
        fontWeight: '300',
    },
    moreButton: {
        height: '80%',
        paddingLeft: 10,
        paddingRight: 16,
        justifyContent: 'center',
    },
})
