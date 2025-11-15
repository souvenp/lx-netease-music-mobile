import { useEffect, useRef, useState } from 'react';
import VideoPlayerModal, { type VideoPlayerModalType } from './VideoPlayerModal';

export default () => {
  const modalRef = useRef<VideoPlayerModalType>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleShow = (url: string) => {
      if (visible) {
        modalRef.current?.show(url);
      } else {
        setVisible(true);
        requestAnimationFrame(() => {
          modalRef.current?.show(url);
        });
      }
    };
    global.app_event.on('showVideoPlayer', handleShow);
    return () => {
      global.app_event.off('showVideoPlayer', handleShow);
    };
  }, [visible]);

  return visible ? <VideoPlayerModal ref={modalRef} /> : null;
};
