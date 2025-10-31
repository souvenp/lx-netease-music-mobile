import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { View } from 'react-native';
import Section from '../../components/Section';
import SubTitle from '../../components/SubTitle';
import InputItem from '../../components/InputItem';
import Button from '../../components/Button';
import CheckBoxItem from '../../components/CheckBoxItem';
import History from './History';
import { useI18n } from '@/lang';
import { useSettingValue } from '@/store/setting/hook';
import { updateSetting } from '@/core/common';
import { createStyle, toast } from '@/utils/tools';
import { dateFormat } from '@/utils/common';
import { useTheme } from '@/store/theme/hook';
import Text from '@/components/common/Text';
import { getSyncHost } from '@/utils/data';
import { testConnection, resetClient } from '@/utils/webdav';
import {
  triggerWebDAVSync,
  manualUploadSettingsAndApis,
  manualDownloadSettingsAndApis,
} from '@/core/sync/webdavSync';
import IsEnable from "@/screens/Home/Views/Setting/settings/Sync/IsEnable.tsx";

export default memo(() => {
  const t = useI18n();
  const theme = useTheme();
  const isEnableWebdav = useSettingValue('sync.webdav.enable');
  const isSyncLists = useSettingValue('sync.webdav.syncLists'); // 新增
  const webdavUrl = useSettingValue('sync.webdav.url');
  const webdavUsername = useSettingValue('sync.webdav.username');
  const webdavPassword = useSettingValue('sync.webdav.password');
  const webdavPath = useSettingValue('sync.webdav.path');
  const lastSyncTimeLists = useSettingValue('sync.webdav.lastSyncTimeLists');

  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [host, setHost] = useState('');

  useEffect(() => {
    void getSyncHost().then(setHost);
  }, []);

  const lastSyncTimeListsStr = useMemo(() => {
    return lastSyncTimeLists ? dateFormat(lastSyncTimeLists, 'Y-M-D h:m:s') : '从未';
  }, [lastSyncTimeLists]);


  const handleEnableWebDAV = (enable: boolean) => {
    updateSetting({ 'sync.webdav.enable': enable });
    resetClient();
  }

  const handleEnableListSync = (enable: boolean) => {
    updateSetting({ 'sync.webdav.syncLists': enable });
  };

  const handleTestConnection = useCallback(async () => {
    if (isTesting) return;
    setIsTesting(true);
    toast('正在测试连接...');
    try {
      await testConnection();
      toast('连接成功！');
    } catch (error: any) {
      toast(`连接失败: ${error.message}`, 'long');
    } finally {
      setIsTesting(false);
    }
  }, [isTesting]);

  const handleSyncNow = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await triggerWebDAVSync(true);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  const handleUpload = useCallback(async () => {
    if (isUploading) return;
    setIsUploading(true);
    await manualUploadSettingsAndApis();
    setIsUploading(false);
  }, [isUploading]);

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    await manualDownloadSettingsAndApis();
    setIsDownloading(false);
  }, [isDownloading]);


  const handleWebdavSettingChanged = (key: keyof LX.AppSetting) => (text: string, callback: (value: string) => void) => {
    updateSetting({ [key]: text });
    resetClient();
    callback(text);
  };

  return (
    <Section title={t('setting_sync')}>
      {/* WebDAV 设置部分 */}
      <SubTitle title="WebDAV 同步">
        <CheckBoxItem
          check={isEnableWebdav}
          label="启用 WebDAV 同步"
          onChange={handleEnableWebDAV}
        />
        <View style={{ opacity: isEnableWebdav ? 1 : 0.5 }}>
          <CheckBoxItem
            check={isSyncLists}
            label="自动同步歌单"
            onChange={handleEnableListSync}
            disabled={!isEnableWebdav}
          />
        </View>

        <View style={{ opacity: isEnableWebdav ? 1 : 0.5 }}>
          <InputItem
            label="服务器地址"
            value={webdavUrl}
            onChanged={handleWebdavSettingChanged('sync.webdav.url')}
            placeholder="https://example.com/webdav"
            editable={isEnableWebdav}
          />
          <InputItem
            label="用户名"
            value={webdavUsername}
            onChanged={handleWebdavSettingChanged('sync.webdav.username')}
            placeholder="请输入用户名"
            editable={isEnableWebdav}
          />
          <InputItem
            label="密码"
            value={webdavPassword}
            onChanged={handleWebdavSettingChanged('sync.webdav.password')}
            placeholder="请输入密码"
            secureTextEntry
            editable={isEnableWebdav}
          />
          <InputItem
            label="同步路径"
            value={webdavPath}
            onChanged={handleWebdavSettingChanged('sync.webdav.path')}
            placeholder="例如: /LX_Music/"
            editable={isEnableWebdav && !isSyncing}
          />

          <View style={styles.btnRow}>
            <Button onPress={handleTestConnection} disabled={!isEnableWebdav || isTesting}>
              {isTesting ? '测试中...' : '测试连接'}
            </Button>
            <Button onPress={handleSyncNow} disabled={!isEnableWebdav || isSyncing}>
              {isSyncing ? '同步中...' : '立即同步歌单'}
            </Button>
          </View>

          <View style={styles.btnRow}>
            <Button onPress={handleUpload} disabled={!isEnableWebdav || isUploading}>
              {isUploading ? '上传中...' : '上传设置与音源'}
            </Button>
            <Button onPress={handleDownload} disabled={!isEnableWebdav || isDownloading}>
              {isDownloading ? '下载中...' : '下载设置与音源'}
            </Button>
          </View>

          <Text style={styles.lastSyncText} size={12} color={theme['c-font-label']}>
            上次歌单同步时间: {lastSyncTimeListsStr}
          </Text>
        </View>
      </SubTitle>

      {/* 原有的同步功能 */}
      <IsEnable host={host} setHost={setHost} />
      <History setHost={setHost} />
    </Section>
  );
});

const styles = createStyle({
  btnRow: {
    flexDirection: 'row',
    paddingLeft: 25,
    marginTop: 5,
    marginBottom: 10,
  },
  lastSyncText: {
    paddingLeft: 25,
    marginTop: 5,
  },
});
