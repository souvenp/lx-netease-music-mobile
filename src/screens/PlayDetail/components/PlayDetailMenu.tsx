import { useMemo, useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import Menu, { type MenuType, type Position, type Menus } from '@/components/common/Menu'
import settingState from '@/store/setting/state'
import userState from '@/store/user/state'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfo
}

const initSelectInfo = {}

export interface PlayDetailMenuProps {
  onAdd: (selectInfo: SelectInfo) => void
  onDownload: (selectInfo: SelectInfo) => void
  onCopyName: (selectInfo: SelectInfo) => void
  onMusicSourceDetail: (selectInfo: SelectInfo) => void
  onDislikeMusic: (selectInfo: SelectInfo) => void
  onArtistDetail: (selectInfo: SelectInfo) => void
  onAlbumDetail: (selectInfo: SelectInfo) => void
  onLike: (selectInfo: SelectInfo) => void
}

export interface PlayDetailMenuType {
  show: (selectInfo: SelectInfo, position: Position) => void;
}

export type { Position }

export default forwardRef<PlayDetailMenuType, PlayDetailMenuProps>((props, ref) => {
  const t = useI18n();
  const [visible, setVisible] = useState(false);
  const menuRef = useRef<MenuType>(null);
  const selectInfoRef = useRef<SelectInfo>(initSelectInfo as SelectInfo);
  const [isLiked, setIsLiked] = useState(false);

  useImperativeHandle(ref, () => ({
    show(selectInfo, position) {
      selectInfoRef.current = selectInfo;
      if (selectInfo.musicInfo.source === 'wy') {
        setIsLiked(userState.wy_liked_song_ids.has(String(selectInfo.musicInfo.meta.songId)));
      }
      if (visible) {
        menuRef.current?.show(position);
      } else {
        setVisible(true);
        requestAnimationFrame(() => {
          menuRef.current?.show(position);
        });
      }
    },
  }));

  const menus = useMemo((): Menus => {
    const musicInfo = selectInfoRef.current.musicInfo;
    const menuItems: Menus[number][] = [
      ...(settingState.setting['download.enable'] ? [{ action: 'download', label: t('download') }] : []),
      { action: 'copyName', label: t('copy_name') },
    ];
    if (musicInfo?.source === 'wy') {
      menuItems.splice(2, 0, {
        action: 'like',
        label: isLiked ? '❤️ 取消喜欢' : '🤍 喜欢',
      });
    }
    if (musicInfo && musicInfo.source !== 'local') {
      menuItems.push(
        { action: 'artistDetail', label: t('artist_detail') },
        { action: 'albumDetail', label: t('album_detail') },
        { action: 'musicSourceDetail', label: t('music_source_detail') }
      );
    }
    return menuItems;
  }, [t, isLiked, selectInfoRef.current.musicInfo]);

  const handleMenuPress = ({ action }: (typeof menus)[number]) => {
    const selectInfo = selectInfoRef.current;
    switch (action) {
      case 'like':
        props.onLike(selectInfo);
        break;
      case 'download':
        props.onDownload(selectInfo);
        break;
      case 'copyName':
        props.onCopyName(selectInfo);
        break;
      case 'artistDetail':
        props.onArtistDetail(selectInfo);
        break;
      case 'albumDetail':
        props.onAlbumDetail(selectInfo);
        break;
      case 'musicSourceDetail':
        props.onMusicSourceDetail(selectInfo);
        break;
      default:
        break;
    }
  };

  return visible ? <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} /> : null;
});
