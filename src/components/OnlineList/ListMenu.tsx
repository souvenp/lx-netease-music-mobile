import { useMemo, useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import settingState from '@/store/setting/state'
import Menu, { type MenuType, type Position } from '@/components/common/Menu'
import { hasDislike } from '@/core/dislikeList'
import {useSettingValue} from "@/store/setting/hook.ts";

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
  onPlayMv: (selectInfo: SelectInfo) => void
  onMove?: (selectInfo: SelectInfo) => void
  onRemove?: (selectInfo: SelectInfo) => void
  listId?: string
  isCreator?: boolean
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

  const menuSetting = {
    playLater: useSettingValue('menu.playLater'),
    addTo: useSettingValue('menu.addTo'),
    share: useSettingValue('menu.share'),
    playMV: useSettingValue('menu.playMV'),
    songDetail: useSettingValue('menu.songDetail'),
    dislike: useSettingValue('menu.dislike'),
  }

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
    const menu = []
    if (menuSetting.playLater) menu.push({ action: 'playLater', label: t('play_later') });
    menu.push({ action: 'download', label: t('download') });
    // if (menuSetting.addTo) menu.push({ action: 'add', label: t('add_to') });
    menu.push({ action: 'add', label: t('add_to') });
    if (props.isCreator) {
      menu.push({ action: 'move', label: t('move_to') });
    }
    if (menuSetting.share) menu.push({ action: 'copyName', label: t('copy_name') });

    const wyMenuItems = [];
    if (selectInfo.musicInfo?.source === 'wy') {
      wyMenuItems.push(
        { action: 'artistDetail', label: t('artist_detail') },
        { action: 'albumDetail', label: t('album_detail') },
      );
      if (selectInfo.musicInfo.meta.mv && menuSetting.playMV) {
        wyMenuItems.push({ action: 'playMv', label: '播放MV' });
      }
    }

    const remainingMenu = []
    if (menuSetting.songDetail)
      remainingMenu.push({ action: 'musicSourceDetail', label: t('music_source_detail') })
    if (menuSetting.dislike)
      remainingMenu.push({ action: 'dislike', label: t('dislike'), disabled: isDislikeMusic })

    if (props.isCreator) {
      remainingMenu.push({ action: 'remove', label: t('delete') });
    }

    return [...menu, ...wyMenuItems, ...remainingMenu];
  }, [t, isDislikeMusic, selectInfo, menuSetting, props.isCreator]);

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
      case 'playMv':
        props.onPlayMv(selectInfo);
        break;
      case 'move':
        props.onMove?.(selectInfo);
        break;
      case 'remove':
        props.onRemove?.(selectInfo);
        break;
      default:
        break
    }
  }

  return visible ? <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} /> : null
})
