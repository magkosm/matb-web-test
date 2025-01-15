import { useState, useEffect, useRef } from 'react';

export function useGamepads() {
  const gamepadsRef = useRef([]);
  
  useEffect(() => {
    const updateGamepads = () => {
      gamepadsRef.current = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    };

    // Initial update
    updateGamepads();

    window.addEventListener('gamepadconnected', updateGamepads);
    window.addEventListener('gamepaddisconnected', updateGamepads);

    return () => {
      window.removeEventListener('gamepadconnected', updateGamepads);
      window.removeEventListener('gamepaddisconnected', updateGamepads);
    };
  }, []);

  return gamepadsRef.current;
} 