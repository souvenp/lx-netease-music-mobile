import {createStyle, toast} from '@/utils/tools'
import { View, TouchableOpacity } from 'react-native'
import PlayModeBtn from './PlayModeBtn'
import MusicAddBtn from './MusicAddBtn'
import DesktopLyricBtn from './DesktopLyricBtn'
import CommentBtn from './CommentBtn'
import {memo, useRef, useCallback, useEffect} from 'react'
import Btn from './Btn'
import { type Position } from '@/screens/Home/Views/Mylist/MusicList/ListMenu'
import PlayDetailMenu, { type PlayDetailMenuType, type SelectInfo } from '@/screens/PlayDetail/components/PlayDetailMenu'
import playerState from '@/store/player/state'
import { handleDislikeMusic, handleShare, handleShowMusicSourceDetail } from '@/screens/Home/Views/Mylist/MusicList/listAction'
import {handleLikeMusic, handleShowAlbumDetail, handleShowArtistDetail} from '@/components/OnlineList/listAction'
import MusicAddModal, { type MusicAddModalType } from '@/components/MusicAddModal'
import MusicDownloadModal, { type MusicDownloadModalType } from '@/screens/Home/Views/Mylist/MusicList/MusicDownloadModal'
import settingState from '@/store/setting/state'
import {getMvUrl} from "@/utils/musicSdk/wy/mv.js";


export default memo(() => {
  const menuRef = useRef<PlayDetailMenuType>(null);
  const moreBtnRef = useRef<TouchableOpacity>(null);
  const musicAddModalRef = useRef<MusicAddModalType>(null);
  const musicDownloadModalRef = useRef<MusicDownloadModalType>(null);

  // 监听歌曲变化，以便在菜单打开时能重新渲染以获取最新的“喜欢”状态
  useEffect(() => {
    const handleMusicChange = () => {
      // 这是一个空的回调，目的只是为了触发组件的重新渲染
      // 以便 useMemo 能够重新计算菜单项
    };
    global.state_event.on('playerMusicInfoChanged', handleMusicChange);
    global.state_event.on('wyLikedListChanged', handleMusicChange);

    return () => {
      global.state_event.off('playerMusicInfoChanged', handleMusicChange);
      global.state_event.off('wyLikedListChanged', handleMusicChange);
    };
  }, []);

  const handleShowMenu = useCallback(() => {
    const musicInfo = playerState.playMusicInfo.musicInfo;
    if (!musicInfo) return;

    moreBtnRef.current?.measure((fx, fy, width, height, px, py) => {
      const position: Position = {
        x: Math.ceil(px),
        y: Math.ceil(py),
        w: Math.ceil(width),
        h: Math.ceil(height),
      };
      menuRef.current?.show({ musicInfo: 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo }, position);
    });
  }, []);

  const onAdd = (info: SelectInfo) => {
    musicAddModalRef.current?.show({
      musicInfo: info.musicInfo,
      isMove: false,
      listId: playerState.playMusicInfo.listId!,
    });
  };

  const onDownload = (info: SelectInfo) => {
    if (settingState.setting['download.enable']) {
      musicDownloadModalRef.current?.show(info.musicInfo);
    }
  };

  const onCopyName = (info: SelectInfo) => {
    handleShare(info.musicInfo);
  };

  const onArtistDetail = (info: SelectInfo) => {
    if (info.musicInfo.source !== 'local') {
      handleShowArtistDetail(info.musicInfo);
    }
  };

  const onAlbumDetail = (info: SelectInfo) => {
    if (info.musicInfo.source !== 'local') {
      handleShowAlbumDetail(info.musicInfo);
    }
  };

  const onMusicSourceDetail = (info: SelectInfo) => {
    void handleShowMusicSourceDetail(info.musicInfo);
  };

  const onDislikeMusic = (info: SelectInfo) => {
    void handleDislikeMusic(info.musicInfo);
  };

  const onPlayMv = useCallback((info: SelectInfo) => {
    const mvId = info.musicInfo.meta.mv;
    if (!mvId) return;
    getMvUrl(mvId).then(data => {
      global.app_event.showVideoPlayer(data.url);
    }).catch(err => {
      toast(err.message || '获取MV失败');
    });
  }, []);

  const onLike = (info: SelectInfo) => {
    if (info.musicInfo.source === 'wy') {
      handleLikeMusic(info.musicInfo as LX.Music.MusicInfoOnline);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <DesktopLyricBtn />
        <MusicAddBtn />
        <PlayModeBtn />
        <CommentBtn />
        <Btn icon="dots-vertical" onPress={handleShowMenu} ref={moreBtnRef} />
      </View>

      <PlayDetailMenu
        ref={menuRef}
        onAdd={onAdd}
        onLike={onLike}
        onDownload={onDownload}
        onCopyName={onCopyName}
        onArtistDetail={onArtistDetail}
        onAlbumDetail={onAlbumDetail}
        onMusicSourceDetail={onMusicSourceDetail}
        onDislikeMusic={onDislikeMusic}
        onPlayMv={onPlayMv}
      />
      <MusicAddModal ref={musicAddModalRef} />
      {settingState.setting['download.enable'] && <MusicDownloadModal ref={musicDownloadModalRef} onDownloadInfo={() => {}} />}
    </>
  )
})

const styles = createStyle({
  container: {
    // flexShrink: 0,
    // flexGrow: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
})
