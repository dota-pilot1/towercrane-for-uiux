import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

// 앱 실행 시 1회 호출. 새 버전이 있으면 확인 후 내려받아 설치하고 재시작한다.
// 개발(브라우저)·네트워크 오류 등 Tauri 밖 환경에서는 조용히 무시한다.
export async function checkForUpdates() {
  try {
    const update = await check();
    if (!update) return;

    const ok = window.confirm(
      `새 버전 ${update.version}이(가) 있습니다.\n지금 업데이트할까요?`,
    );
    if (!ok) return;

    await update.downloadAndInstall();
    await relaunch();
  } catch (err) {
    console.warn("업데이트 확인을 건너뜁니다:", err);
  }
}
