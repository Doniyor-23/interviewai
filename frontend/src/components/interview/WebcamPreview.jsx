import { Camera, CameraOff, Eye, EyeOff, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function WebcamPreview({ webcam, className = '' }) {
  const { t } = useTranslation();

  const {
    supported,
    enabled,
    visible,
    status,
    error,
    videoRef,
    enable,
    disable,
    toggle,
    toggleVisible,
  } = webcam;

  if (!supported) {
    return (
      <div className={`rounded-2xl border border-line bg-ink-900/60 p-4 text-xs text-muted ${className}`}>
        <div className="flex items-center gap-2 text-amber-300">
          <CameraOff size={16} />
          <span>{t('interview.cameraNotSupported', 'Webcam is not supported in this browser.')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line bg-ink-900/80 shadow-lg backdrop-blur transition-all duration-300 ${className}`}>
      {/* Top Header / Bar */}
      <div className="flex items-center justify-between border-b border-line/60 bg-ink-950/60 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            {enabled && status === 'active' ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </>
            ) : status === 'error' ? (
              <span className="size-2 rounded-full bg-red-500" />
            ) : (
              <span className="size-2 rounded-full bg-muted/40" />
            )}
          </span>
          <span className="font-medium text-fg/90">
            {enabled && status === 'active'
              ? t('interview.cameraActive', 'Camera Active')
              : status === 'starting'
              ? t('interview.cameraConnecting', 'Connecting...')
              : status === 'error'
              ? t('interview.cameraError', 'Camera Error')
              : t('interview.cameraOff', 'Camera Off')}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {enabled && (
            <button
              type="button"
              onClick={toggleVisible}
              className="rounded-lg p-1 text-muted hover:bg-ink-800 hover:text-fg"
              title={visible ? t('interview.hidePreview', 'Hide Preview') : t('interview.showPreview', 'Show Preview')}
              aria-label={visible ? t('cameraUI.hide') : t('cameraUI.show')}
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}

          <button
            type="button"
            onClick={toggle}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
              enabled
                ? 'bg-ink-800 text-fg hover:bg-red-500/20 hover:text-red-300'
                : 'bg-brand-violet/20 text-brand-soft hover:bg-brand-violet/30'
            }`}
            title={enabled ? t('interview.disableCamera', 'Turn Off Camera') : t('interview.enableCamera', 'Turn On Camera')}
          >
            {enabled ? (
              <>
                <CameraOff size={13} />
                <span>{t('interview.stopCamera', 'Off')}</span>
              </>
            ) : (
              <>
                <Camera size={13} />
                <span>{t('interview.startCamera', 'On')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Camera Video / Error / Idle State */}
      <div className={`relative bg-ink-950 transition-all ${visible ? 'aspect-video w-full' : 'p-4 text-center'}`}>
        {enabled && visible ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover -scale-x-100"
          />
        ) : !enabled ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-ink-800/80 text-muted">
              <Camera size={22} />
            </div>
            <p className="mt-2 text-xs font-medium text-fg/80">
              {t('interview.cameraOptionalTitle', 'Webcam is optional')}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {t('interview.cameraOptionalNotice', 'No video is recorded or stored. It helps you practice body language and presence.')}
            </p>
            <button
              type="button"
              onClick={enable}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand-violet px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#6d4cf0]"
            >
              <Camera size={14} />
              <span>{t('interview.enableCameraNow', 'Enable Camera')}</span>
            </button>
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-muted">
            <p>{t('interview.previewHidden', 'Preview is hidden. Camera is still active.')}</p>
            <button
              type="button"
              onClick={toggleVisible}
              className="mt-2 text-xs font-medium text-brand-soft hover:underline"
            >
              {t('interview.restorePreview', 'Show preview')}
            </button>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950/90 p-4 text-center">
            <AlertCircle size={20} className="text-red-400" />
            <p className="mt-1.5 text-xs font-medium text-red-300">
              {error === 'camera_permission_denied'
                ? t('interview.cameraPermissionDenied', 'Camera permission was denied in your browser.')
                : error === 'camera_not_found'
                ? t('interview.cameraNotFound', 'No camera device found.')
                : error === 'camera_in_use'
                ? t('interview.cameraInUse', 'Camera is already in use by another app.')
                : t('interview.cameraFailed', 'Failed to connect to camera.')}
            </p>
            <button
              type="button"
              onClick={enable}
              className="mt-2 flex items-center gap-1 rounded bg-ink-800 px-2 py-1 text-xs text-fg hover:bg-ink-700"
            >
              <RefreshCw size={12} />
              <span>{t('common.retry', 'Retry')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
