import { memo, useRef } from 'react';
import { View } from 'react-native';
import SubTitle from '../../components/SubTitle';
import Button from '../../components/Button';
import { useSettingValue } from '@/store/setting/hook';
import { updateSetting } from '@/core/common';
import FileSelect, { type FileSelectType } from '@/components/common/FileSelect';
import { createStyle, toast } from '@/utils/tools';
import Text from '@/components/common/Text';
import { privateStorageDirectoryPath, mkdir, copyFile, unlink, existsFile } from '@/utils/fs';

const BG_PIC_DIR = privateStorageDirectoryPath + '/backgrounds';

export default memo(() => {
  const customBgPath = useSettingValue('theme.customBgPicPath');
  const fileSelectRef = useRef<FileSelectType>(null);

  const handleSelectPath = () => {
    fileSelectRef.current?.show(
      {
        title: '选择背景图片',
        dirOnly: false,
        filter: ['jpg', 'jpeg', 'png', 'webp'],
      },
      async (path) => {
        if (!path) return;

        try {
          await mkdir(BG_PIC_DIR);

          if (customBgPath && customBgPath.startsWith('file://' + BG_PIC_DIR)) {
            if (await existsFile(customBgPath.replace('file://', ''))) {
              await unlink(customBgPath.replace('file://', ''));
            }
          }
          const extension = path.split('.').pop()?.split('?')[0] || 'jpg';
          const newFileName = `bg_${Date.now()}.${extension}`;
          const newPath = `${BG_PIC_DIR}/${newFileName}`;
          await copyFile(path, newPath);
          updateSetting({ 'theme.customBgPicPath': `file://${newPath}` });
          toast('背景设置成功');

        } catch (error: any) {
          console.error('设置背景图片失败:', error);
          toast(`设置背景图片失败: ${error.message}`, 'long');
        }
      },
    );
  };

  const handleClearPath = async() => {
    // 清除设置的同时，也删除已保存的背景图文件
    if (customBgPath && customBgPath.startsWith('file://' + BG_PIC_DIR)) {
      try {
        if (await existsFile(customBgPath.replace('file://', ''))) {
          await unlink(customBgPath.replace('file://', ''));
        }
      } catch (e) {
        console.error('删除旧背景图片失败:', e);
      }
    }
    updateSetting({ 'theme.customBgPicPath': '' });
  };

  return (
    <>
      <SubTitle title={'自定义背景'}>
        {customBgPath ? <Text style={styles.path} numberOfLines={2}>当前: {customBgPath}</Text> : null}
        <View style={styles.btns}>
          <Button onPress={handleSelectPath}>{'选择图片'}</Button>
          <Button onPress={handleClearPath}>{'清除背景'}</Button>
        </View>
      </SubTitle>
      <FileSelect ref={fileSelectRef} />
    </>
  );
});

const styles = createStyle({
  path: {
    marginBottom: 10,
  },
  btns: {
    flexDirection: 'row',
  },
});
