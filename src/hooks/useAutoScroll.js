import { useEffect, useRef } from 'react';

export const useAutoScroll = () => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

  return scrollRef;
}; 