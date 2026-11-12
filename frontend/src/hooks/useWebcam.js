import { useCallback, useEffect, useRef, useState } from 'react';

const isSupported = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === 'function';

export function useWebcam() {
  const supported = isSupported();
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | starting | active | error
  const [error, setError] = useState('');
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const mounted = useRef(true);
  const requestId = useRef(0);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          /* ignore */
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const disable = useCallback(() => {
    requestId.current++;
    stopTracks();
    setEnabled(false);
    setStatus('idle');
    setError('');
  }, [stopTracks]);

  const enable = useCallback(async () => {
    if (!supported) {
      setError('camera_not_supported');
      setStatus('error');
      return false;
    }
    stopTracks();
    const request = ++requestId.current;
    setStatus('starting');
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false, // audio handled separately by mic
      });

      if (!mounted.current || request !== requestId.current) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setEnabled(true);
      setStatus('active');
      return true;
    } catch (err) {
      if (!mounted.current || request !== requestId.current) return false;
      const name = err.name || '';
      stopTracks();
      setEnabled(false);
      setStatus('error');

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('camera_permission_denied');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('camera_not_found');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setError('camera_in_use');
      } else {
        setError('camera_error');
      }
      return false;
    }
  }, [supported, stopTracks]);

  const toggle = useCallback(() => {
    if (status === 'starting') return;
    if (enabled) disable();
    else enable();
  }, [enabled, status, disable, enable]);

  const toggleVisible = useCallback(() => {
    setVisible((v) => !v);
  }, []);

  // Ensure stream connects if video element is mounted after stream is obtained
  useEffect(() => {
    if (enabled && streamRef.current && videoRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [enabled]);

  // Teardown tracks when unmounting or leaving page
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; requestId.current++; stopTracks(); };
  }, [stopTracks]);

  return {
    supported,
    enabled,
    visible,
    status,
    error,
    clearError: () => setError(''),
    videoRef,
    stream: streamRef.current,
    enable,
    disable,
    toggle,
    toggleVisible,
    stopTracks,
  };
}
