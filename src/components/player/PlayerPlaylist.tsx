import {forwardRef, useImperativeHandle, useRef, useState, useEffect, useCallback, memo, useMemo} from 'react';
import AnimatedSlideUpPanel, { type AnimatedSlideUpPanelType } from '@/components/common/AnimatedSlideUpPanel';
import { useI18n } from '@/lang';
import { FlatList, View, TouchableOpacity } from 'react-native';
import Text from '@/components/common/Text';
import { useTheme } from '@/store/theme/hook';
import playerState from '@/store/player/state';
import { getListMusicSync } from '@/utils/listManage';
import { usePlayInfo, usePlayerMusicInfo } from '@/store/player/hook';
import { playList } from '@/core/player/player';
import { createStyle, toast, type RowInfo } from '@/utils/tools';
import { scaleSizeH } from '@/utils/pixelRatio';
import { LIST_ITEM_HEIGHT, LIST_IDS } from '@/config/constant';
import MusicAddModal, { type MusicAddModalType } from '@/components/MusicAddModal';
import MusicDownloadModal, { type MusicDownloadModalType } from '@/screens/Home/Views/Mylist/MusicList/MusicDownloadModal';
import { useSettingValue } from '@/store/setting/hook';
import listState from '@/store/list/state';
import { addTempPlayList } from '@/core/player/tempPlayList';
import { Icon } from "@/components/common/Icon.tsx";

import OnlineListItem from '@/components/OnlineList/ListItem';
import ListMenu, { type ListMenuType, type Position, type SelectInfo } from '@/components/OnlineList/ListMenu';
import {
  handleDislikeMusic,
  handleLikeMusic,
  handleShowAlbumDetail,
  handleShowArtistDetail,
  handleShowMusicSourceDetail,
} from "@/components/OnlineList/listAction";
import { handleShare } from '@/screens/Home/Views/Mylist/MusicList/listAction';
import settingState from '@/store/setting/state';

export interface PlayerPlaylistType {
  show: () => void;
}

export default forwardRef<PlayerPlaylistType, {}>((props, ref) => {
  const panelRef = useRef<AnimatedSlideUpPanelType>(null);
  const flatListRef = useRef<FlatList>(null);
  const t = useI18n();
  const theme = useTheme();
  const playerInfo = usePlayInfo();
  const playerMusicInfo = usePlayerMusicInfo();
  const [playlist, setPlaylist] = useState<LX.Player.PlayMusic[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const musicDownloadModalRef = useRef<MusicDownloadModalType>(null);
  const listMenuRef = useRef<ListMenuType>(null);
  const musicAddModalRef = useRef<MusicAddModalType>(null);
  const isShowAlbumName = useSettingValue('list.isShowAlbumName');
  const isShowInterval = useSettingValue('list.isShowInterval');
  const showCover = useSettingValue('list.isShowCover');
  const rowInfo = useRef({ rowNum: undefined, rowWidth: '100%' } as const).current;

  useImperativeHandle(ref, () => ({
    show() {
      setIsVisible(true);
    },
  }));
  const { activeIndex, totalCount } = useMemo(() => {
    if (!playlist.length) return { activeIndex: -1, totalCount: 0 };

    const index = playlist.findIndex(item => ('progress' in item ? item.metadata.musicInfo.id : item.id) === playerMusicInfo.id);
    return { activeIndex: index, totalCount: playlist.length };
  }, [playlist, playerMusicInfo.id]);

  useEffect(() => {
    if (isVisible) {
      panelRef.current?.setVisible(true);
      if (playerInfo.playerListId) {
        const currentList = getListMusicSync(playerInfo.playerListId);
        setPlaylist(currentList);
      }
    }
  }, [isVisible, playerInfo.playerListId]);

  useEffect(() => {
    if (isVisible && playlist.length > 0) {
      const activeIndex = playlist.findIndex(item => ('progress' in item ? item.metadata.musicInfo.id : item.id) === playerMusicInfo.id);
      if (activeIndex > -1) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: activeIndex,
            viewPosition: 0,
            animated: true,
          });
        }, 100);
      }
    }
  }, [isVisible, playlist, playerMusicInfo.id]);

  const handlePlay = useCallback((index: number) => {
    if (playerInfo.playerListId) {
      void playList(playerInfo.playerListId, index);
    }
  }, [playerInfo.playerListId]);

  const handleShowMenu = useCallback((musicInfo: LX.Music.MusicInfo, index: number, position: Position) => {
    // 菜单需要 MusicInfoOnline 类型适配
    const adaptedMusicInfo = {
      ...musicInfo,
      source: musicInfo.source as LX.OnlineSource,
      meta: {
        ...musicInfo.meta,
        qualitys: (musicInfo as LX.Music.MusicInfoOnline).meta.qualitys || [],
        _qualitys: (musicInfo as LX.Music.MusicInfoOnline).meta._qualitys || {},
      },
    } as LX.Music.MusicInfoOnline;

    listMenuRef.current?.show({
      musicInfo: adaptedMusicInfo,
      index,
      single: true,
      selectedList: [],
    }, position);
  }, []);


  const renderItem = ({ item, index }: { item: LX.Player.PlayMusic, index: number }) => {
    const originalMusicInfo = ('progress' in item ? item.metadata.musicInfo : item);

    // 将所有类型的 musicInfo 转换为 OnlineListItem 能安全渲染的结构
    const renderableMusicInfo: LX.Music.MusicInfoOnline = {
      ...originalMusicInfo,
      id: originalMusicInfo.id,
      name: originalMusicInfo.name,
      singer: originalMusicInfo.singer,
      source: originalMusicInfo.source as LX.OnlineSource,
      interval: originalMusicInfo.interval,
      alias: originalMusicInfo.alias || null,
      artists: originalMusicInfo.artists || [],
      meta: {
        ...originalMusicInfo.meta,
        songId: originalMusicInfo.meta.songId,
        picUrl: originalMusicInfo.meta.picUrl,
        albumName: originalMusicInfo.meta.albumName,
        // 提供安全的默认值以防止崩溃
        qualitys: (originalMusicInfo as LX.Music.MusicInfoOnline).meta.qualitys || [],
        _qualitys: (originalMusicInfo as LX.Music.MusicInfoOnline).meta._qualitys || {},
        fee: (originalMusicInfo as LX.Music.MusicInfoOnline).meta.fee ?? 0,
        originCoverType: (originalMusicInfo as LX.Music.MusicInfoOnline).meta.originCoverType ?? 0,
      },
    } as LX.Music.MusicInfoOnline;

    const listIdForIcon = playerInfo.playerListId === LIST_IDS.TEMP ? listState.tempListMeta.id : playerInfo.playerListId;

    return (
      <OnlineListItem
        item={renderableMusicInfo}
        index={index}
        onPress={() => handlePlay(index)}
        onLongPress={() => {}}
        onShowMenu={(musicInfo, index, position) => {
          handleShowMenu(originalMusicInfo, index, position); // 菜单使用原始数据
        }}
        selectedList={[]}
        playingId={playerMusicInfo.id}
        rowInfo={rowInfo}
        isShowAlbumName={isShowAlbumName}
        isShowInterval={isShowInterval}
        listId={listIdForIcon ?? undefined}
        showCover={showCover}
      />
    );
  };

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: scaleSizeH(LIST_ITEM_HEIGHT),
    offset: scaleSizeH(LIST_ITEM_HEIGHT) * index,
    index,
  }), []);

  const onAdd = (info: SelectInfo) => {
    musicAddModalRef.current?.show({
      musicInfo: info.musicInfo,
      isMove: false,
      listId: playerState.playMusicInfo.listId!,
    });
  };

  const onPlayLater = (info: SelectInfo) => {
    addTempPlayList([{
      listId: playerState.playMusicInfo.listId!,
      musicInfo: info.musicInfo,
      isTop: true,
    }]);
    toast('已添加到下一首播放');
  };

  const onDownload = (info: SelectInfo) => {
    musicDownloadModalRef.current?.show(info.musicInfo);
  };

  const onArtistDetail = (info: SelectInfo) => {
    panelRef.current?.setVisible(false);
    requestAnimationFrame(() => {
      handleShowArtistDetail(info.musicInfo);
    });
  };

  const onAlbumDetail = (info: SelectInfo) => {
    panelRef.current?.setVisible(false);
    requestAnimationFrame(() => {
      handleShowAlbumDetail(info.musicInfo);
    });
  };

  const onLike = (info: SelectInfo) => {
    if (info.musicInfo.source === 'wy') {
      handleLikeMusic(info.musicInfo as LX.Music.MusicInfoOnline);
    }
  };

  const onMusicSourceDetail = (info: SelectInfo) => {
    panelRef.current?.setVisible(false);
    requestAnimationFrame(() => {
      handleShowMusicSourceDetail(info.musicInfo);
    });
  };

  const handlePanelHide = () => {
    setIsVisible(false);
  };

  return (
    <>
      <AnimatedSlideUpPanel ref={panelRef} onHide={handlePanelHide}>
        <View style={{ ...styles.panelContent, backgroundColor: theme['c-content-background'] }}>
          <View style={{ ...styles.header, borderBottomColor: theme['c-border-background'] }}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.panelTitle}>{t('list_name_temp')}</Text>
              {activeIndex > -1 && (
                <Text style={styles.countText} size={12} color={theme['c-font-label']}>
                  {activeIndex + 1} / {totalCount}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => panelRef.current?.setVisible(false)} style={styles.closeButton}>
              <Icon name="close" size={14} color={theme['c-font-label']} />
            </TouchableOpacity>
          </View>
          <FlatList
            ref={flatListRef}
            style={styles.list}
            data={playlist}
            renderItem={renderItem}
            keyExtractor={(item, index) => 'progress' in item ? item.id : item.id + index}
            initialNumToRender={10}
            getItemLayout={getItemLayout}
          />
        </View>
      </AnimatedSlideUpPanel>

      <ListMenu
        ref={listMenuRef}
        onPlay={() => {}}
        onPlayLater={onPlayLater}
        onAdd={onAdd}
        onDownload={onDownload}
        onCopyName={handleShare}
        onMusicSourceDetail={onMusicSourceDetail}
        onDislikeMusic={handleDislikeMusic}
        onArtistDetail={onArtistDetail}
        onAlbumDetail={onAlbumDetail}
        onLike={onLike}
      />
      <MusicAddModal ref={musicAddModalRef} />
      {settingState.setting['download.enable'] && <MusicDownloadModal ref={musicDownloadModalRef} onDownloadInfo={() => {}} />}
    </>
  );
});

const styles = createStyle({
  panelContent: {
    flex: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
  },
  panelTitle: {
    paddingVertical: 15,
    // paddingLeft: 15,
    fontSize: 14,
  },
  countText: {
    marginLeft: 8,
    paddingBottom: 1,
  },
  closeButton: {
    padding: 15,
  },
  list: {
    flex: 1,
  },
});
