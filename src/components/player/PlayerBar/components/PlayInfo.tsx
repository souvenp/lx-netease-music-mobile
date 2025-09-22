import { memo, useCallback, useState } from 'react';
import { View } from 'react-native';
import Status from './Status';
import { createStyle } from '@/utils/tools';
import { COMPONENT_IDS } from '@/config/constant';
import { usePageVisible } from '@/store/common/hook';

export default ({ isHome }: { isHome: boolean }) => {
  const [autoUpdate, setAutoUpdate] = useState(true);

  usePageVisible(
    [COMPONENT_IDS.home],
    useCallback(
      (visible) => {
        if (isHome) setAutoUpdate(visible);
      },
      [isHome],
    ),
  );

  return (
    <View style={styles.container}>
      <Status autoUpdate={autoUpdate} />
    </View>
  );
};

const styles = createStyle({
  container: {
    flex: 1,
    justifyContent: 'center',
    height: '100%',
    paddingRight: 5,
  },
});
