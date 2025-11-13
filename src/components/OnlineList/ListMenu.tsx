import { useMemo, useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import settingState from '@/store/setting/state'
import Menu, { type MenuType, type Position } from '@/components/common/Menu'
import { hasDislike } from '@/core/dislikeList'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfoOnline
  selectedList: LX.Music.MusicInfoOnline[]
  index: number
  single: boolean
}
const initSelectInfo = {}

export interface ListMenuProps {
  onPlay: (selectInfo: SelectInfo) => void
  onPlayLater: (selectInfo: SelectInfo) => void
  onAdd: (selectInfo: SelectInfo) => void
  onDownload: (selectInfo: SelectInfo) => void
  onCopyName: (selectInfo: SelectInfo) => void
  onMusicSourceDetail: (selectInfo: SelectInfo) => void
  onDislikeMusic: (selectInfo: SelectInfo) => void
  onArtistDetail: (selectInfo: SelectInfo) => void
  onAlbumDetail: (selectInfo: SelectInfo) => void
  onLike: (selectInfo: SelectInfo) => void
  listId?: string
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position: Position) => void
}

export type { Position }

export default forwardRef<ListMenuType, ListMenuProps>((props: ListMenuProps, ref) => {
  const t = useI18n()
  const [visible, setVisible] = useState(false)
  const menuRef = useRef<MenuType>(null)
  const [selectInfo, setSelectInfo] = useState<SelectInfo>(initSelectInfo as SelectInfo);
  const [isDislikeMusic, setDislikeMusic] = useState(false)

  useImperativeHandle(ref, () => ({
    show(newSelectInfo, position) {
      setSelectInfo(newSelectInfo);
      setDislikeMusic(hasDislike(newSelectInfo.musicInfo))
      if (visible) menuRef.current?.show(position)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          menuRef.current?.show(position)
        })
      }
    },
  }))

  const menus = useMemo(() => {
    const menu = [
      // { action: 'play', label: t('play') },
      { action: 'playLater', label: t('play_later') },
      ...(settingState.setting['download.enable']
        ? [{ action: 'download', label: t('download') }]
        : []),
      { action: 'add', label: t('add_to') },
      { action: 'copyName', label: t('copy_name') },
    ] as const;

    const wyMenuItems =
      selectInfo.musicInfo?.source === 'wy'
        ? [
          { action: 'artistDetail', label: t('artist_detail') },
          { action: 'albumDetail', label: t('album_detail') },
        ]
        : [];

    const remainingMenu = [
      { action: 'musicSourceDetail', label: t('music_source_detail') },
      { action: 'dislike', label: t('dislike'), disabled: isDislikeMusic },
    ] as const;

    return [...menu, ...wyMenuItems, ...remainingMenu];
  }, [t, isDislikeMusic, selectInfo]);

  const handleMenuPress = ({ action }: (typeof menus)[number]) => {
    switch (action) {
      case 'play':
        props.onPlay(selectInfo)
        break
      case 'like':
        props.onLike(selectInfo)
        break
      case 'playLater':
        props.onPlayLater(selectInfo)
        break
      case 'download':
        props.onDownload(selectInfo)
        break
      case 'add':
        props.onAdd(selectInfo)
        break
      case 'copyName':
        props.onCopyName(selectInfo)
        break
      case 'artistDetail':
        props.onArtistDetail(selectInfo)
        break
      case 'albumDetail':
        props.onAlbumDetail(selectInfo)
        break
      case 'musicSourceDetail':
        props.onMusicSourceDetail(selectInfo)
        break
      case 'dislike':
        props.onDislikeMusic(selectInfo)
        break
      default:
        break
    }
  }

  return visible ? <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} /> : null
})
