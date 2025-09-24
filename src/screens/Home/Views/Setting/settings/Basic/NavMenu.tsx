// 文件路径: screens/Home/Views/Setting/settings/Basic/NavMenu.tsx (新建文件)

import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import SubTitle from '../../components/SubTitle';
import CheckBox from '@/components/common/CheckBox';
import { useSettingValue } from '@/store/setting/hook';
import { useI18n } from '@/lang';
import { updateSetting } from '@/core/common';
import { NAV_MENUS, NAV_ID_Type } from '@/config/constant';

const Item = ({ id, name }: { id: NAV_ID_Type; name: string }) => {
  const navStatus = useSettingValue('common.navStatus');
  const isChecked = useMemo(() => navStatus[id] ?? true, [navStatus, id]);
  const isDisabled = useMemo(() => id === 'nav_search' || id === 'nav_setting', [id]);

  const handleChange = (check: boolean) => {
    updateSetting({ 'common.navStatus': { ...navStatus, [id]: check } });
  };

  return (
    <CheckBox
      marginRight={8}
      check={isChecked}
      label={name}
      onChange={handleChange}
      disabled={isDisabled}
    />
  );
};

export default memo(() => {
  const t = useI18n();
  const menuList = useMemo(() => {
    return NAV_MENUS.map((item) => ({ id: item.id, name: t(item.id) }));
  }, [t]);

  return (
    <SubTitle title={t('setting_basic_nav_menu')}>
      <View style={styles.list}>
        {menuList.map(({ id, name }) => (
          <Item key={id} id={id} name={name} />
        ))}
      </View>
    </SubTitle>
  );
});

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
