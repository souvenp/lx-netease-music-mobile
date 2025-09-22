import { memo } from 'react'

import Section from '../../components/Section'
import IsEnable from './IsEnable'
import IsWriteLyrics from './IsWriteLyrics'
import IsWriteRomaLyrics from './IsWriteRomaLyrics'
import IsWriteEmbedLyrics from './IsWriteEmbedLyrics'
import IsWriteTags from './IsWriteTags'
import IsWriteCover from './IsWriteCover'
import FileNameFormat from './FileNameFormat'
import { useI18n } from '@/lang'
import SubTitle from '../../components/SubTitle'
import DownloadPath from "@/screens/Home/Views/Setting/settings/Download/DownloadPath.tsx";

export default memo(() => {
  const t = useI18n()

  return (
    <Section title={t('setting_download')}>
      <IsEnable />
      <DownloadPath />
      <SubTitle title={t('setting_download_options_title')}>
        <IsWriteTags />
        <IsWriteLyrics />
        <IsWriteRomaLyrics />
        <IsWriteEmbedLyrics />
        <IsWriteCover />
      </SubTitle>
      <FileNameFormat />
    </Section>
  )
})
