import { useEffect, useMemo, useState } from 'react'
import Search from '../Views/Search'
import SongList from '../Views/SongList'
import Mylist from '../Views/Mylist'
import Leaderboard from '../Views/Leaderboard'
import Setting from '../Views/Setting'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import DailyRec from '../Views/DailyRec'
import MyPlaylist from '../Views/MyPlaylist'
import SubscribedAlbums from "@/screens/Home/Views/SubscribedAlbums";
import FollowedArtists from "@/screens/Home/Views/FollowedArtists";

const Main = () => {
  const [id, setId] = useState(commonState.navActiveId)

  useEffect(() => {
    const handleUpdate = (id: CommonState['navActiveId']) => {
      requestAnimationFrame(() => {
        setId(id)
      })
    }
    global.state_event.on('navActiveIdUpdated', handleUpdate)
    return () => {
      global.state_event.off('navActiveIdUpdated', handleUpdate)
    }
  }, [])

  const component = useMemo(() => {
    switch (id) {
      case 'nav_daily_rec':
        return <DailyRec />
      case 'nav_my_playlist':
        return <MyPlaylist />
      case 'nav_songlist':
        return <SongList />
      case 'nav_top':
        return <Leaderboard />
      case 'nav_followed_artists':
        return <FollowedArtists />
      case 'nav_subscribed_albums':
        return <SubscribedAlbums />
      case 'nav_love':
        return <Mylist />
      case 'nav_setting':
        return <Setting />
      case 'nav_search':
      default:
        return <Search />
    }
  }, [id])

  return component
}

export default Main
