import { memo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Icon } from '@/components/common/Icon';
import { pop } from '@/navigation';
import Text from '@/components/common/Text';
import { useStatusbarHeight } from '@/store/common/hook';
import { createStyle } from '@/utils/tools';
import { scaleSizeH } from '@/utils/pixelRatio';
import { HEADER_HEIGHT as _HEADER_HEIGHT } from '@/config/constant';

const HEADER_HEIGHT = scaleSizeH(_HEADER_HEIGHT);

// 多选时优先清空勾选，普通状态才返回上一页。
export default memo(({ componentId, onBack }: { componentId: string, onBack?: () => void }) => {
  const statusBarHeight = useStatusbarHeight();
  const back = () => { if (onBack) onBack(); else void pop(componentId); };

  return (
    <View style={{ height: HEADER_HEIGHT + statusBarHeight, paddingTop: statusBarHeight }}>
      <View style={styles.container}>
        <TouchableOpacity onPress={back} style={{ ...styles.button, width: HEADER_HEIGHT }}>
          <Icon name="chevron-left" size={18} />
        </TouchableOpacity>
        <Text numberOfLines={1} size={16} style={styles.title}>下载管理</Text>
        <View style={{width: HEADER_HEIGHT}} />
      </View>
    </View>
  );
});

const styles = createStyle({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});
