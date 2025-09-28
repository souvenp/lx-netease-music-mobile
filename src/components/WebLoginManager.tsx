import { useEffect, useRef, useState } from 'react';
import WebLoginModal, { type WebLoginModalType } from './WebLoginModal';

export default () => {
  const modalRef = useRef<WebLoginModalType>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleShow = () => {
      if (visible) {
        modalRef.current?.show();
      } else {
        setVisible(true);
        requestAnimationFrame(() => {
          modalRef.current?.show();
        });
      }
    };

    global.app_event.on('showWebLogin', handleShow);
    return () => {
      global.app_event.off('showWebLogin', handleShow);
    };
  }, [visible]);

  return visible ? <WebLoginModal ref={modalRef} /> : null;
};
