import { getWindow } from "./window";

export const reloadPage = () => {
  const win = getWindow();
  if (win) {
    win.location.reload();
  }
};
