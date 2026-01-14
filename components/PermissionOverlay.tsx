
import React, { useState, useEffect } from 'react';

interface PermissionOverlayProps {
  onComplete: () => void;
}

type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported' | 'done';

const PermissionOverlay: React.FC<PermissionOverlayProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [notifStatus, setNotifStatus] = useState<PermissionStatus>('idle');
  const [cameraStatus, setCameraStatus] = useState<PermissionStatus>('idle');
  const [geoStatus, setGeoStatus] = useState<PermissionStatus>('idle');
  
  const [batteryStatus, setBatteryStatus] = useState<boolean>(false);
  const [backgroundStatus, setBackgroundStatus] = useState<boolean>(false);
  const [showBypass, setShowBypass] = useState(false);

  useEffect(() => {
    // Check existing permissions
    if ('Notification' in window && Notification.permission === 'granted') setNotifStatus('granted');
    
    const checkPermissions = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const cam = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (cam.state === 'granted') setCameraStatus('granted');
          
          const geo = await navigator.permissions.query({ name: 'geolocation' });
          if (geo.state === 'granted') setGeoStatus('granted');
        }
      } catch (e) {
        console.warn("Permission query not supported");
      }
    };
    checkPermissions();

    // Show bypass button after 5 seconds if stuck
    const timer = setTimeout(() => setShowBypass(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('unsupported');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotifStatus(permission === 'granted' ? 'granted' : 'denied');
    } catch (e) {
      setNotifStatus('denied');
    }
  };

  const handleRequestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraStatus('granted');
    } catch (e) {
      setCameraStatus('denied');
    }
  };

  const handleRequestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      () => setGeoStatus('granted'), 
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true }
    );
  };

  // Logic: Allow proceed if Camera and Location are granted, Notification is optional but recommended
  const canProceed = cameraStatus === 'granted' && geoStatus === 'granted';

  if (step === 1) {
    return (
      <div className="w-full max-w-lg glass p-8 rounded-[2.5rem] border border-slate-800 animate-in zoom-in duration-300 shadow-2xl">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600/20 rounded-3xl mx-auto mb-6 flex items-center justify-center border border-blue-500/30">
            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Phase 01: Hardware Hooks</h2>
          <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest">Enable core browser sensors</p>
        </div>

        <div className="space-y-3 mb-10">
          <PermissionItem title="Surveillance Optics" status={cameraStatus} onAction={handleRequestCamera} />
          <PermissionItem title="Global Positioning" status={geoStatus} onAction={handleRequestLocation} />
          <PermissionItem title="Push Relays (Optional)" status={notifStatus} onAction={handleRequestNotifications} />
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setStep(2)}
            disabled={!canProceed && !showBypass}
            className={`w-full py-4 rounded-2xl font-black tracking-widest transition-all ${canProceed ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/40' : 'bg-slate-800 text-slate-500 opacity-50'}`}
          >
            {canProceed ? 'CONTINUE TO SYSTEM SETUP' : 'AUTHORIZE CRITICAL HOOKS'}
          </button>
          
          {showBypass && !canProceed && (
            <button 
              onClick={() => setStep(2)}
              className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
            >
              Skip / Emergency Bypass ⚡
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg glass p-8 rounded-[2.5rem] border border-slate-800 animate-in slide-in-from-right duration-500 shadow-2xl">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-emerald-600/20 rounded-3xl mx-auto mb-6 flex items-center justify-center border border-emerald-500/30">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Phase 02: Persistence</h2>
        <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest">Enable Background Stability</p>
      </div>

      <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl mb-8">
        <p className="text-[11px] text-red-400 font-bold leading-relaxed text-center">
          ⚠️ FOR BEST PERFORMANCE: <br/> Manually set Battery to 'Unrestricted' in phone settings.
        </p>
      </div>

      <div className="space-y-4 mb-10">
        <SystemSetupItem 
          title="Battery Optimization" 
          desc="Set to 'Unrestricted' for 24/7 access." 
          done={batteryStatus} 
          onAction={() => {
            setBatteryStatus(true);
            window.location.href = "intent:#Intent;action=android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS;end";
          }} 
        />
        <SystemSetupItem 
          title="Background Activity" 
          desc="Ensure app continues when screen is off." 
          done={backgroundStatus} 
          onAction={() => {
            setBackgroundStatus(true);
            // Attempt to open app settings
            window.location.href = "intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:" + window.location.hostname + ";end";
          }} 
        />
      </div>

      <div className="flex gap-4">
        <button onClick={() => setStep(1)} className="px-6 py-4 bg-slate-800 text-white rounded-2xl font-bold">BACK</button>
        <button
          onClick={onComplete}
          className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black tracking-widest shadow-lg shadow-emerald-900/40 hover:bg-emerald-500"
        >
          START TERMINAL
        </button>
      </div>
    </div>
  );
};

const PermissionItem = ({ title, status, onAction }: any) => {
  const isGranted = status === 'granted';
  const isDenied = status === 'denied';
  return (
    <div className={`p-4 rounded-2xl border transition-all ${isGranted ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900 border-slate-800'}`}>
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
           <span className={`text-sm font-bold ${isGranted ? 'text-emerald-400' : 'text-slate-300'}`}>{title}</span>
           {isDenied && <span className="text-[8px] text-red-500 font-bold uppercase">Blocked by browser</span>}
        </div>
        <button 
          onClick={onAction} 
          disabled={isGranted}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isGranted ? 'bg-emerald-500/20 text-emerald-400 cursor-default' : 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 active:scale-95'}`}
        >
          {isGranted ? 'READY' : 'ENABLE'}
        </button>
      </div>
    </div>
  );
};

const SystemSetupItem = ({ title, desc, done, onAction }: any) => (
  <div className={`p-4 rounded-2xl border transition-all ${done ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900 border-slate-800'}`}>
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm font-bold text-slate-100">{title}</span>
      <button onClick={onAction} className="text-[10px] font-black text-blue-400 hover:text-blue-300 underline uppercase tracking-widest">Settings ↗</button>
    </div>
    <p className="text-[10px] text-slate-500 leading-tight">{desc}</p>
    <label className="flex items-center gap-2 mt-3 cursor-pointer">
      <input type="checkbox" checked={done} onChange={onAction} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500" />
      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Done</span>
    </label>
  </div>
);

export default PermissionOverlay;
