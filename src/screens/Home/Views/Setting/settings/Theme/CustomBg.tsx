import { memo, useRef } from 'react';
import { View } from 'react-native';
import SubTitle from '../../components/SubTitle';
import Button from '../../components/Button';
import { useSettingValue } from '@/store/setting/hook';
import { updateSetting } from '@/core/common';
import FileSelect, { type FileSelectType } from '@/components/common/FileSelect';
import { createStyle } from '@/utils/tools';
import Text from '@/components/common/Text';

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
      (path) => {
        if (!path) return;
        updateSetting({ 'theme.customBgPicPath': `file://${path}` });
      },
    );
  };

  const handleClearPath = () => {
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
})
