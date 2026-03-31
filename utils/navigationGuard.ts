interface NavigationGuard {
  run: (action: () => void) => boolean;
  reset: () => void;
  dispose: () => void;
}

export function createNavigationGuard(cooldownMs = 900): NavigationGuard {
  let locked = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const unlock = () => {
    locked = false;
    clearTimer();
  };

  return {
    run: (action) => {
      if (locked) {
        return false;
      }

      locked = true;
      clearTimer();
      timer = setTimeout(() => {
        unlock();
      }, cooldownMs);

      try {
        action();
        return true;
      } catch (error) {
        unlock();
        throw error;
      }
    },

    reset: unlock,
    dispose: unlock,
  };
}
