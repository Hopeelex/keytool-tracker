import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, Smartphone, PowerOff } from 'lucide-react';
import Peer from 'peerjs';

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const remoteId = urlParams.get('remote');
  const isMobileTransmitter = !!remoteId;

  const [tools, setTools] = useState([
    { id: 1, name: 'Hammer', status: 'missing' },
    { id: 2, name: 'Drill', status: 'missing' },
    { id: 3, name: 'Wrench', status: 'missing' },
    { id: 4, name: 'Pliers', status: 'missing' },
    { id: 5, name: 'Screwdriver', status: 'missing' },
    { id: 6, name: 'Tape measure', status: 'missing' },
    { id: 7, name: 'Level', status: 'missing' },
    { id: 8, name: 'Hand saw', status: 'missing' },
    { id: 9, name: 'Hex keys', status: 'missing' },
  ]);

  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), message: 'Sistema iniciado. Esperando conexión.' },
  ]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [boundingBoxes, setBoundingBoxes] = useState([]);
  
  const [peerId, setPeerId] = useState('');
  const [peerInstance, setPeerInstance] = useState(null);
  const [currentUrl, setCurrentUrl] = useState('');

  const storedCount = tools.filter(t => t.status === 'stored').length;
  const missingCount = tools.length - storedCount;

  // --- CORRECCIÓN EN LA CONEXIÓN WEBRTC ---
  useEffect(() => {
    if (isMobileTransmitter) {
      const peer = new Peer();
      
      // 1. Esperamos que el Peer esté abierto
      peer.on('open', () => {
        // 2. Pedimos la cámara (sin audio para que no haya eco)
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(e => console.error(e));
            }
            // 3. HASTA que la cámara está lista, llamamos a la laptop
            peer.call(remoteId, stream);
          })
          .catch(err => alert("Da permisos de cámara en tu celular para transmitir."));
      });
    } else {
      setCurrentUrl(window.location.origin); 
      const peer = new Peer();
      
      peer.on('open', (id) => {
        setPeerId(id); 
      });

      peer.on('call', (call) => {
        call.answer(); 
        call.on('stream', (remoteStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            videoRef.current.play().catch(e => console.error(e));
            setIsCameraOn(true);
            setCapturedImage(null);
          }
        });
      });
      setPeerInstance(peer);
    }
  }, [isMobileTransmitter, remoteId]);

  const startLocalCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraOn(true);
      setCapturedImage(null);
      setBoundingBoxes([]);
    } catch (err) {
      alert("No se pudo acceder a la cámara de la laptop.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    setCapturedImage(null);
    setBoundingBoxes([]);
  };

  const captureAndAnalyze = useCallback(() => {
    if (!videoRef.current) return;
    setIsAnalyzing(true);
    setBoundingBoxes([]);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageDataUrl);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('image', blob, 'capture.jpg');

      try {
        const BACKEND_URL = '/api/v1/analyze'; 
        const response = await fetch(BACKEND_URL, { method: 'POST', body: formData });
        if (!response.ok) throw new Error("Error en FastAPI");
        
        const data = await response.json();
        
        if (data.detections) {
          setBoundingBoxes(data.detections);
          const timeString = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const detectedNames = data.detections.map(d => d.class_name.toLowerCase());
          
          setTools(prevTools => {
            const newLogs = [];
            const updatedTools = prevTools.map(tool => {
              const isDetected = detectedNames.includes(tool.name.toLowerCase());
              const wasStored = tool.status === 'stored';
              const newStatus = isDetected ? 'stored' : 'missing';
              
              if (wasStored && newStatus === 'missing') {
                newLogs.push({ time: timeString, message: `⚠️ ${tool.name} retirado` });
              } else if (!wasStored && newStatus === 'stored') {
                newLogs.push({ time: timeString, message: `✅ ${tool.name} devuelto` });
              }
              return { ...tool, status: newStatus };
            });

            if (newLogs.length > 0) setLogs(prev => [...newLogs, ...prev]);
            else setLogs(prev => [{ time: timeString, message: `🔍 Escaneo: Sin cambios` }, ...prev]);
            return updatedTools;
          });
        }
      } catch (error) {
        console.error(error);
        alert("Asegúrate de que FastAPI está corriendo.");
      } finally {
        setIsAnalyzing(false);
      }
    }, 'image/jpeg');
  }, []);

  if (isMobileTransmitter) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 font-['Albert_Sans']">
        <Smartphone size={48} className="text-purple-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold mb-2 text-center">Cámara Vinculada</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">Transmisión en vivo al dashboard.</p>
        <div className="w-full max-w-sm aspect-[4/3] bg-black rounded-2xl overflow-hidden border-4 border-purple-600 shadow-[0_0_20px_rgba(147,51,234,0.4)]">
           <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
        <p className="text-slate-500 text-xs mt-8">Mantén esta pantalla abierta</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center w-full font-['Albert_Sans']">
      <div className="w-full max-w-5xl min-h-screen lg:min-h-fit lg:my-8 bg-white lg:rounded-3xl lg:shadow-xl flex flex-col px-6 pt-6 pb-8 gap-8 relative overflow-x-hidden">
        
        {/* HEADER */}
        <div className="w-full flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Key Logo" className="w-10 h-10 object-contain rounded" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
            <div className="hidden w-10 h-10 bg-purple-700 text-white rounded font-bold flex items-center justify-center text-xl shadow-sm">K</div>
            <div className="text-black text-2xl font-bold tracking-tight">KeyTool Tracker</div>
          </div>
          <div className="px-3 py-1.5 rounded-full border border-gray-200 flex items-center gap-2 bg-slate-50">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <div className="text-slate-700 text-xs font-bold uppercase tracking-wider">Online</div>
          </div>
        </div>

        {/* LAYOUT RESPONSIVO */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* SECCIÓN CÁMARA */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="w-full flex justify-between items-center">
              <div className="text-black text-xl font-bold">Live Camera Feed</div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-purple-600 animate-bounce' : (isCameraOn ? 'bg-blue-600' : 'bg-slate-400')}`} />
                <div className={`text-[10px] font-bold tracking-wider uppercase ${isAnalyzing ? 'text-purple-600' : (isCameraOn ? 'text-blue-600' : 'text-slate-400')}`}>
                  {isAnalyzing ? 'Analyzing...' : (isCameraOn ? 'Live · Móvil' : 'Standby')}
                </div>
              </div>
            </div>
            
            <div className="w-full aspect-[4/3] lg:aspect-video relative rounded-2xl flex justify-center items-center overflow-hidden bg-[#0A0F1C] shadow-inner border border-slate-800">
              
              <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${!isCameraOn && !capturedImage ? 'hidden' : ''}`} />
              
              {capturedImage && (
                <div className="absolute inset-0 w-full h-full">
                  <img src={capturedImage} alt="Capture" className="w-full h-full object-cover" />
                  {boundingBoxes.map((box, index) => (
                    <div key={index} className="absolute border-[3px] border-blue-500 bg-blue-500/10"
                      style={{ left: `${box.bbox_xywh[0]*100}%`, top: `${box.bbox_xywh[1]*100}%`, width: `${box.bbox_xywh[2]*100}%`, height: `${box.bbox_xywh[3]*100}%` }}>
                      <div className="absolute -top-[26px] left-[-3px] px-2.5 py-1 bg-blue-500 rounded-t text-white text-xs font-bold shadow-sm whitespace-nowrap">
                        {box.class_name}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isCameraOn && !capturedImage && peerId && (
                <div className="flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                  <div className="p-3 bg-white rounded-2xl mb-4 shadow-xl">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(currentUrl + '?remote=' + peerId)}`} alt="QR" className="w-36 h-36" />
                  </div>
                  <p className="text-white text-sm font-medium mb-3">Escanea para usar tu celular como cámara</p>
                  <button onClick={startLocalCamera} className="text-slate-400 hover:text-white text-xs font-medium underline transition-colors z-10">
                    O usar la cámara de esta laptop
                  </button>
                </div>
              )}
              
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <div className="w-full flex gap-3">
              <button 
                onClick={captureAndAnalyze} disabled={!isCameraOn || isAnalyzing}
                className={`flex-1 py-3.5 text-white rounded-xl font-bold transition-all shadow-sm text-lg ${!isCameraOn || isAnalyzing ? 'bg-slate-300' : 'bg-purple-700 hover:bg-purple-800 active:scale-[0.98]'}`}
              >
                {isAnalyzing ? 'Procesando IA...' : 'Escanear Herramientas'}
              </button>
              
              {capturedImage ? (
                <button onClick={() => setCapturedImage(null)} title="Limpiar captura" className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl active:scale-95 transition-colors">
                  <RefreshCw size={24} />
                </button>
              ) : (
                isCameraOn && (
                  <button onClick={stopCamera} title="Desconectar Cámara" className="px-5 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl active:scale-95 transition-colors">
                    <PowerOff size={24} />
                  </button>
                )
              )}
            </div>
          </div>

          {/* SECCIÓN INVENTARIO */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="w-full flex flex-col gap-4">
              <div className="w-full flex justify-between items-center">
                <div className="text-black text-xl font-bold">Inventario</div>
                <div className="text-slate-500 text-xs font-medium bg-slate-100 px-2.5 py-1 rounded-md">{storedCount} guardadas / {missingCount} fuera</div>
              </div>
              <div className="w-full grid grid-cols-3 gap-3">
                {tools.map((tool) => {
                  const isStored = tool.status === 'stored';
                  const borderStyle = isStored ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-purple-600 bg-purple-50/60 shadow-sm';
                  const statusBoxStyle = isStored ? 'border-2 border-green-500' : 'border-[2.5px] border-purple-600 shadow-[0_0_5px_rgba(147,51,234,0.3)]';
                  return (
                    <div key={tool.id} className={`p-3 rounded-xl border flex flex-col justify-center h-[80px] transition-all ${borderStyle}`}>
                      <div className="w-full flex justify-between items-start">
                        <div className={`w-full text-[13px] ${isStored ? 'font-medium text-slate-600' : 'font-bold text-black'} truncate pr-1`}>{tool.name}</div>
                        <div className={`w-3 h-3 ${statusBoxStyle} rounded-full flex-shrink-0 mt-0.5`} />
                      </div>
                      <div className="text-slate-400 text-[10px] uppercase tracking-wide font-bold mt-1.5">{tool.status.replace('-', ' ')}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-full flex flex-col gap-4">
              <div className="w-full flex justify-between items-center">
                <div className="text-black text-xl font-bold">Actividad Reciente</div>
                <div className="text-slate-500 text-xs font-medium">Hoy</div>
              </div>
              <div className="w-full flex flex-col border border-slate-200 rounded-2xl px-4 py-2 bg-white shadow-sm h-full max-h-[200px] overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="w-full py-3 border-b border-slate-100 flex items-center gap-4 last:border-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    <div className="text-slate-400 text-xs font-bold w-16">{log.time}</div>
                    <div className="flex-1 text-slate-700 text-sm font-medium truncate">{log.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}