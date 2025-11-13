import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import settingState from '@/store/setting/state'
import Menu, { type Menus, type MenuType, type Position } from '@/components/common/Menu'
import { hasDislike } from '@/core/dislikeList'
import { existsFile } from '@/utils/fs'

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
  const selectInfoRef = useRef<SelectInfo>(initSelectInfo as SelectInfo)
  const [menus, setMenus] = useState<Menus>([])

  useImperativeHandle(ref, () => ({
    show(selectInfo, position) {
      selectInfoRef.current = selectInfo
      handleSetMenu(selectInfo.musicInfo)
      if (visible) menuRef.current?.show(position)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          menuRef.current?.show(position)
        })
      }
    },
  }))

  const handleSetMenu = (musicInfo: LX.Music.MusicInfo) => {
    let edit_metadata = false
    const menu: Menus[number][] = [
      // { action: 'play', label: t('play') },
      { action: 'playLater', label: t('play_later') },
      ...(settingState.setting['download.enable']
        ? [{ action: 'download', label: t('download') }]
        : []),
      { action: 'add', label: t('add_to') },
      { action: 'move', label: t('move_to') },
      { action: 'changePosition', label: t('change_position') },
      { action: 'toggleSource', label: t('toggle_source') },
      { action: 'copyName', label: t('copy_name') },
      {
        action: 'musicSourceDetail',
        disabled: musicInfo.source == 'local',
        label: t('music_source_detail'),
      },
    ]

    if (musicInfo.source === 'wy') {
      menu.push(
        { action: 'artistDetail', label: t('artist_detail') },
        { action: 'albumDetail', label: t('album_detail') },
      )
    }
    // ------------------------------------

    menu.push(
      { action: 'dislike', disabled: hasDislike(musicInfo), label: t('dislike') },
      { action: 'remove', label: t('delete') },
    )

    if (musicInfo.source == 'local') {
      menu.splice(3, 0, { // 调整插入位置
        action: 'editMetadata',
        disabled: !edit_metadata,
        label: t('edit_metadata'),
      })
    }

    setMenus(menu)
    void Promise.all([hasEditMetadata(musicInfo)]).then(([_edit_metadata]) => {
      let isUpdated = false
      if (edit_metadata != _edit_metadata) {
        edit_metadata = _edit_metadata
        isUpdated ||= true
      }

      if (isUpdated && musicInfo.source == 'local') {
        const editIndex = menu.findIndex((m) => m.action == 'editMetadata')
        if (editIndex > -1) {
          menu[editIndex].disabled = !edit_metadata
          setMenus([...menu])
        }
      }
    })
  }

  const handleMenuPress = ({ action }: (typeof menus)[number]) => {
    const selectInfo = selectInfoRef.current
    switch (action) {
      // case 'play': props.onPlay(selectInfo); break;
      case 'playLater': props.onPlayLater(selectInfo); break;
      case 'download': props.onDownload(selectInfo); break
      case 'add': props.onAdd(selectInfo); break
      case 'move': props.onMove(selectInfo); break;
      case 'editMetadata': props.onEditMetadata(selectInfo); break
      case 'copyName': props.onCopyName(selectInfo); break
      case 'changePosition': props.onChangePosition(selectInfo); break;
      case 'toggleSource': props.onToggleSource(selectInfo); break
      case 'artistDetail': props.onArtistDetail(selectInfo); break
      case 'albumDetail': props.onAlbumDetail(selectInfo); break
      case 'dislike': props.onDislikeMusic(selectInfo); break
      case 'musicSourceDetail':
        props.onMusicSourceDetail(selectInfo)
        break
      case 'remove': props.onRemove(selectInfo); break
      default:
        break
    }
  }

  return visible ? <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} /> : null
})
