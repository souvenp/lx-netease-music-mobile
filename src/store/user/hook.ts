import { useEffect, useState } from 'react'
import state from './state'

export const useIsWyLiked = (songId: string | number) => {
  const strId = String(songId)
  const [isLiked, setIsLiked] = useState(() => state.wy_liked_song_ids.has(strId))

  useEffect(() => {
    const handleUpdate = () => {
      const newLikedStatus = state.wy_liked_song_ids.has(strId)
      setIsLiked(currentStatus => currentStatus === newLikedStatus ? currentStatus : newLikedStatus)
    }
    global.state_event.on('wyLikedListChanged', handleUpdate)
    handleUpdate()
    return () => {
      global.state_event.off('wyLikedListChanged', handleUpdate)
    }
  }, [strId]) // 依赖项数组保持不变，仅当 songId 变化时才重新设置 effect

  return isLiked
}

export const useIsWyArtistFollowed = (artistId: string | number | undefined) => { // 允许传入 undefined
  const strId = String(artistId)
  const [isFollowed, setIsFollowed] = useState(() => artistId === undefined || artistId === null ? false : state.wy_followed_artists.some(a => String(a.id) === strId))

  useEffect(() => {
    // 当 artistId 无效时，确保状态为 false
    if (artistId === undefined || artistId === null) {
      setIsFollowed(false)
      return
    }

    const handleUpdate = () => {
      const newFollowedStatus = state.wy_followed_artists.some(a => String(a.id) === strId)
      setIsFollowed(newFollowedStatus)
    }

    global.state_event.on('wyFollowedListChanged', handleUpdate)
    handleUpdate() // 首次加载或 artistId 变化时，立即检查并更新状态

    return () => {
      global.state_event.off('wyFollowedListChanged', handleUpdate)
    }
  }, [strId, artistId]) // 同时依赖 strId 和 artistId

  return isFollowed
}

export const useWyFollowedArtists = () => {
  const [list, setList] = useState(() => state.wy_followed_artists)

  useEffect(() => {
    const handleUpdate = () => {
      setList([...state.wy_followed_artists])
    }
    global.state_event.on('wyFollowedListChanged', handleUpdate)
    handleUpdate()
    return () => {
      global.state_event.off('wyFollowedListChanged', handleUpdate)
    }
  }, [])

  return list
}


export const useIsWyAlbumSubscribed = (albumId: string | number | undefined) => {
  const strId = String(albumId);
  const [isSubscribed, setIsSubscribed] = useState(() =>
    albumId === undefined || albumId === null ? false : state.wy_subscribed_albums.some(a => String(a.id) === strId),
  );

  useEffect(() => {
    if (albumId === undefined || albumId === null) {
      setIsSubscribed(false);
      return;
    }

    const handleUpdate = () => {
      const newSubscribedStatus = state.wy_subscribed_albums.some(a => String(a.id) === strId);
      setIsSubscribed(newSubscribedStatus);
    };

    global.state_event.on('wySubscribedAlbumsChanged', handleUpdate);
    handleUpdate();

    return () => {
      global.state_event.off('wySubscribedAlbumsChanged', handleUpdate);
    };
  }, [strId, albumId]);

  return isSubscribed;
};

export const useWySubscribedAlbums = () => {
  const [list, setList] = useState(() => state.wy_subscribed_albums);
  useEffect(() => {
    const handleUpdate = () => {
      setList([...state.wy_subscribed_albums]);
    };
    global.state_event.on('wySubscribedAlbumsChanged', handleUpdate);
    handleUpdate();
    return () => {
      global.state_event.off('wySubscribedAlbumsChanged', handleUpdate);
    };
  }, []);
  return list;
};
