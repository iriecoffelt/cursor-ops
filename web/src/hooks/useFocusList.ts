import { useCallback, useEffect, useState } from "react";
import type { TaskItem } from "../../server/types";
import {
  FOCUS_MAX,
  loadFocusPins,
  pinTaskInStorage,
  type FocusPin,
  taskPinKey,
  unpinTaskInStorage,
} from "../utils/focusList";

export function useFocusList() {
  const [pins, setPins] = useState<FocusPin[]>(() => loadFocusPins());

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "pulse-focus-today") {
        setPins(loadFocusPins());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pin = useCallback(
    (item: TaskItem) => {
      const result = pinTaskInStorage(item, pins);
      if (result.ok) setPins(loadFocusPins());
      return result;
    },
    [pins],
  );

  const unpin = useCallback(
    (item: Pick<TaskItem, "source" | "id">) => {
      unpinTaskInStorage(item, pins);
      setPins(loadFocusPins());
    },
    [pins],
  );

  const isPinned = useCallback(
    (item: Pick<TaskItem, "source" | "id">) => pins.some((pin) => taskPinKey(pin) === taskPinKey(item)),
    [pins],
  );

  return {
    pins,
    pin,
    unpin,
    isPinned,
    canPinMore: pins.length < FOCUS_MAX,
    max: FOCUS_MAX,
  };
}

export type FocusListControls = ReturnType<typeof useFocusList>;
