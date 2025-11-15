import { useRef, useImperativeHandle, forwardRef, useState, useEffect, useMemo } from 'react'
import { useI18n } from '@/lang'
import Menu, { type Menus, type MenuType, type Position } from '@/components/common/Menu'
import { hasDislike } from '@/core/dislikeList'
import { existsFile } from '@/utils/fs'
import { useSettingValue } from '@/store/setting/hook'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfo
  selectedList: LX.Music.MusicInfo[]
  index: number
  listId: string
  single: boolean
}
const initSelectInfo = {}

export interface ListMenuProps {
  // onPlay: (selectInfo: SelectInfo) => void
  onPlayLater: (selectInfo: SelectInfo) => void
  onAdd: (selectInfo: SelectInfo) => void
  onMove: (selectInfo: SelectInfo) => void
  onEditMetadata: (selectInfo: SelectInfo) => void
  onDownload: (selectInfo: SelectInfo) => void
  onCopyName: (selectInfo: SelectInfo) => void
  onChangePosition: (selectInfo: SelectInfo) => void
  onToggleSource: (selectInfo: SelectInfo) => void
  onMusicSourceDetail: (selectInfo: SelectInfo) => void
  onArtistDetail: (selectInfo: SelectInfo) => void
  onAlbumDetail: (selectInfo: SelectInfo) => void
  onDislikeMusic: (selectInfo: SelectInfo) => void
  onRemove: (selectInfo: SelectInfo) => void
  onPlayMv: (selectInfo: SelectInfo) => void
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position: Position) => void
}

export type { Position }

const hasEditMetadata = async (musicInfo: LX.Music.MusicInfo) => {
  if (musicInfo.source != 'local') return false
  return existsFile(musicInfo.meta.filePath)
}

export default forwardRef<ListMenuType, ListMenuProps>((props, ref) => {
  const t = useI18n()
  const [visible, setVisible] = useState(false)
  const menuRef = useRef<MenuType>(null)
  const [selectInfo, setSelectInfo] = useState<SelectInfo | null>(null)
  const [menus, setMenus] = useState<Menus>([])

  const menuPlayLater = useSettingValue('menu.playLater')
  const menuShare = useSettingValue('menu.share')
  const menuPlayMV = useSettingValue('menu.playMV')
  const menuSongDetail = useSettingValue('menu.songDetail')
  const menuDislike = useSettingValue('menu.dislike')


  const menuSetting = useMemo(() => ({
    playLater: menuPlayLater,
    share: menuShare,
    playMV: menuPlayMV,
    songDetail: menuSongDetail,
    dislike: menuDislike,
  }), [
    menuPlayLater, menuShare, menuPlayMV, menuSongDetail, menuDislike,
  ])

  useImperativeHandle(ref, () => ({
    show(info, position) {
      setSelectInfo(info)
      if (visible) {
        menuRef.current?.show(position)
      } else {
        setVisible(true)
        requestAnimationFrame(() => {
          menuRef.current?.show(position)
        })
      }
    },
  }))

  useEffect(() => {
    if (!selectInfo) return

    const buildMenu = async() => {
      const musicInfo = selectInfo.musicInfo
      const menu: Menus[number][] = []

      if (menuSetting.playLater) menu.push({ action: 'playLater', label: t('play_later') })
      menu.push({ action: 'download', label: t('download') })
      menu.push({ action: 'add', label: t('add_to') })
      menu.push({ action: 'move', label: t('move_to') })
      menu.push({ action: 'changePosition', label: t('change_position') })
      menu.push({ action: 'toggleSource', label: t('toggle_source') })
      if (menuSetting.share) menu.push({ action: 'copyName', label: t('copy_name') })
      if (menuSetting.songDetail) {
        menu.push({
          action: 'musicSourceDetail',
          disabled: musicInfo.source == 'local',
          label: t('music_source_detail'),
        })
      }

      if (musicInfo.source === 'wy') {
        menu.push({ action: 'artistDetail', label: t('artist_detail') })
        menu.push({ action: 'albumDetail', label: t('album_detail') })
        if (musicInfo.meta.mv && menuSetting.playMV) {
          menu.push({ action: 'playMv', label: '播放MV' })
        }
      }

      if (menuSetting.dislike) menu.push({ action: 'dislike', disabled: hasDislike(musicInfo), label: t('dislike') })
      menu.push({ action: 'remove', label: t('delete') })

      if (musicInfo.source == 'local') {
        const canEdit = await hasEditMetadata(musicInfo)
        menu.splice(3, 0, {
          action: 'editMetadata',
          disabled: !canEdit,
          label: t('edit_metadata'),
        })
      }
      setMenus(menu)
    }

    void buildMenu()
  }, [selectInfo, menuSetting, t])

  const handleMenuPress = ({ action }: (typeof menus)[number]) => {
    const info = selectInfo
    if (!info) return
    switch (action) {
      case 'playLater': props.onPlayLater(info); break
      case 'download': props.onDownload(info); break
      case 'add': props.onAdd(info); break
      case 'move': props.onMove(info); break
      case 'editMetadata': props.onEditMetadata(info); break
      case 'copyName': props.onCopyName(info); break
      case 'changePosition': props.onChangePosition(info); break
      case 'toggleSource': props.onToggleSource(info); break
      case 'artistDetail': props.onArtistDetail(info); break
      case 'albumDetail': props.onAlbumDetail(info); break
      case 'dislike': props.onDislikeMusic(info); break
      case 'musicSourceDetail': props.onMusicSourceDetail(info); break
      case 'remove': props.onRemove(info); break
      case 'playMv': props.onPlayMv(info); break
      default:
        break
    }
  }

  return visible ? <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} /> : null
})
