import { memo } from 'react'

import Section from '../../components/Section'
import AddMusicLocationType from './AddMusicLocationType'
import IsClickPlayList from './IsClickPlayList'
import IsShowAlbumName from './IsShowAlbumName'
import IsShowInterval from './IsShowInterval'
import IsAutoSaveDailyRec from './IsAutoSaveDailyRec';
import IsShowMyListSubMenu from './IsShowMyListSubMenu';

import { useI18n } from '@/lang'
import MenuSettings from "@/screens/Home/Views/Setting/settings/List/MenuSettings.tsx";

export default memo(() => {
  const t = useI18n()

  return (
    <Section title={t('setting_list')}>
      <IsClickPlayList />
      <IsShowAlbumName />
      <IsShowInterval />
      <IsShowMyListSubMenu />
      <IsAutoSaveDailyRec />
      <AddMusicLocationType />
      <MenuSettings />
    </Section>
  )
})
