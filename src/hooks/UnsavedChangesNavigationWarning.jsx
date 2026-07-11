import { useContext, useEffect } from "react";
import {
  UNSAFE_DataRouterContext as DataRouterContext,
  useBlocker,
} from "react-router-dom";
import { confirmDiscard } from "./useUnsavedChangesWarning";

function RouterUnsavedChangesBlocker({ dirty }) {
  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (blocker.state !== "blocked") return;

    if (confirmDiscard()) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  return null;
}

export default function UnsavedChangesNavigationWarning({ dirty }) {
  const dataRouterContext = useContext(DataRouterContext);
  if (!dataRouterContext) return null;
  return <RouterUnsavedChangesBlocker dirty={dirty} />;
}
