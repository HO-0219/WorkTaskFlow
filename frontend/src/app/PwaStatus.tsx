import { useEffect, useState } from 'react';
import { activatePwaUpdate, isPwaInstallAvailable, isPwaUpdateAvailable, promptPwaInstall } from './pwa';

export function PwaStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [installable, setInstallable] = useState(isPwaInstallAvailable());
  const [updateAvailable, setUpdateAvailable] = useState(isPwaUpdateAvailable());

  useEffect(() => {
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    const installHandler = () => setInstallable(isPwaInstallAvailable());
    const installedHandler = () => setInstallable(false);
    const updateHandler = () => setUpdateAvailable(true);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    window.addEventListener('pwa-install-available', installHandler);
    window.addEventListener('pwa-installed', installedHandler);
    window.addEventListener('pwa-update-available', updateHandler);
    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      window.removeEventListener('pwa-install-available', installHandler);
      window.removeEventListener('pwa-installed', installedHandler);
      window.removeEventListener('pwa-update-available', updateHandler);
    };
  }, []);

  if (online && !installable && !updateAvailable) return null;
  return <aside className={`pwa-status ${online ? '' : 'offline'}`} role="status" aria-live="polite">
    <span>{!online
      ? '오프라인입니다. 저장된 화면만 볼 수 있으며 조회·변경은 연결 후 가능합니다.'
      : updateAvailable ? '새 버전이 준비되었습니다.' : '이 기기에 앱으로 설치할 수 있습니다.'}</span>
    {online && updateAvailable && <button type="button" onClick={activatePwaUpdate}>업데이트</button>}
    {online && !updateAvailable && installable && <button type="button" onClick={promptPwaInstall}>설치</button>}
  </aside>;
}
