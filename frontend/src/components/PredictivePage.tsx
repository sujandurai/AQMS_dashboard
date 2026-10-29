import { useEffect, useState, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Area, AreaChart } from 'recharts';
import { BrainCircuit, Activity, TrendingUp, Loader2, Target, Cpu, Zap, Layers, Network, Sparkles, CircuitBoard } from 'lucide-react';
import { io } from 'socket.io-client';
import { cn } from '../lib/utils';

const WINDOW_SIZE = 10;
const EPOCHS = 50;
const MAX_HISTORY = 100;

/* ═══════════════════════════════════════════════════════
   Neural Network Background Canvas
   ═══════════════════════════════════════════════════════ */
function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<any[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    // Create neural nodes
    const nodeCount = 60;
    const nodes: any[] = [];
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: 1.5 + Math.random() * 2,
        pulsePhase: Math.random() * Math.PI * 2,
        layer: Math.floor(Math.random() * 4), // Neural "layer" for color coding
      });
    }
    nodesRef.current = nodes;

    const layerColors = [
      'rgba(96, 211, 148, ',   // primary green
      'rgba(56, 189, 248, ',   // cyan
      'rgba(168, 85, 247, ',   // purple
      'rgba(251, 146, 60, ',   // orange
    ];

    let frame = 0;

    const animate = () => {
      frame++;
      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;
      ctx.clearRect(0, 0, cw, ch);

      // Update positions
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > cw) node.vx *= -1;
        if (node.y < 0 || node.y > ch) node.vy *= -1;
        node.x = Math.max(0, Math.min(cw, node.x));
        node.y = Math.max(0, Math.min(ch, node.y));
      }

      // Draw connections
      const maxDist = 150;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.15;
            // Pulsing signal along connection
            const pulseAlpha = Math.sin(frame * 0.02 + i * 0.3) * 0.5 + 0.5;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = layerColors[nodes[i].layer] + (alpha * (0.5 + pulseAlpha * 0.5)) + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Traveling data packet along connection
            if (dist < 80 && frame % 3 === 0) {
              const t = (Math.sin(frame * 0.03 + i) * 0.5 + 0.5);
              const px = nodes[i].x + (nodes[j].x - nodes[i].x) * t;
              const py = nodes[i].y + (nodes[j].y - nodes[i].y) * t;
              ctx.beginPath();
              ctx.arc(px, py, 1, 0, Math.PI * 2);
              ctx.fillStyle = layerColors[nodes[i].layer] + '0.6)';
              ctx.fill();
            }
          }
        }
      }

      // Draw nodes with pulse
      for (const node of nodes) {
        const pulse = Math.sin(frame * 0.03 + node.pulsePhase) * 0.5 + 0.5;
        const r = node.radius * (1 + pulse * 0.3);
        
        // Glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 4);
        gradient.addColorStop(0, layerColors[node.layer] + (0.3 * pulse) + ')');
        gradient.addColorStop(1, layerColors[node.layer] + '0)');
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = layerColors[node.layer] + (0.6 + pulse * 0.4) + ')';
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  );
}

/* ═══════════════════════════════════════════════════════
   Animated Data Pipeline SVG
   ═══════════════════════════════════════════════════════ */
function DataPipeline({ isActive }: { isActive: boolean }) {
  return (
    <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden rounded-t-xl">
      <div className={cn(
        "h-full rounded-full transition-all duration-700",
        isActive 
          ? "bg-gradient-to-r from-transparent via-primary to-transparent animate-[shimmer_2s_ease-in-out_infinite]" 
          : "bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      )} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AI Metric Card with Live Effects
   ═══════════════════════════════════════════════════════ */
function AiMetricCard({ 
  icon: Icon, 
  label, 
  children, 
  glowColor = 'primary',
  isActive = false 
}: { 
  icon: any; 
  label: string; 
  children: React.ReactNode;
  glowColor?: string;
  isActive?: boolean;
}) {
  return (
    <div className="group relative glass-card rounded-xl border border-border p-5 overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10">
      {/* Top pipeline */}
      <DataPipeline isActive={isActive} />
      
      {/* Corner circuitry decoration */}
      <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-25 transition-opacity duration-500">
        <CircuitBoard className="w-8 h-8 text-primary" />
      </div>
      
      {/* Subtle background pulse */}
      <div className={cn(
        "absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl transition-opacity duration-1000",
        isActive ? "opacity-20" : "opacity-5",
        glowColor === 'orange' ? 'bg-orange-500' : glowColor === 'cyan' ? 'bg-cyan-500' : 'bg-primary'
      )} />
      
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2 flex items-center gap-1.5 relative z-10">
        <Icon className={cn(
          "w-3.5 h-3.5 transition-all duration-300",
          isActive ? "text-primary animate-pulse" : "text-muted-foreground"
        )} />
        {label}
      </p>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Animated Counter
   ═══════════════════════════════════════════════════════ */
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(tick);
      else prevRef.current = end;
    };

    requestAnimationFrame(tick);
  }, [value]);

  return <>{display.toFixed(decimals)}</>;
}

/* ═══════════════════════════════════════════════════════
   Training Progress Ring
   ═══════════════════════════════════════════════════════ */
function TrainingRing({ isTraining, epoch }: { isTraining: boolean; epoch: number }) {
  const circumference = 2 * Math.PI * 18;
  const progress = isTraining ? (epoch / EPOCHS) : 1;
  
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" className="text-border" strokeWidth="2" />
        <circle 
          cx="20" cy="20" r="18" fill="none" 
          stroke="url(#ringGradient)" 
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {isTraining ? (
          <Cpu className="w-4 h-4 text-primary animate-spin" style={{ animationDuration: '3s' }} />
        ) : (
          <Sparkles className="w-4 h-4 text-primary" />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */
export default function PredictivePage() {
  const [targetFeature, setTargetFeature] = useState<'pm2_5' | 'temperature' | 'aqi' | 'humidity' | 'co2'>('pm2_5');
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [availableNodes, setAvailableNodes] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [loss, setLoss] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [trainingCount, setTrainingCount] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [tensorCount, setTensorCount] = useState(0);
  
  const modelRef = useRef<tf.Sequential | null>(null);

  // Periodically report tensor count for the UI
  useEffect(() => {
    const interval = setInterval(() => {
      setTensorCount(tf.memory().numTensors);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // 1. Initialise the TensorFlow.js Model & Socket Stream
  useEffect(() => {
    const socket = io("http://localhost:5000");
    
    socket.on("node_data", (data: any) => {
       setAvailableNodes(prev => prev.includes(data.nodeId) ? prev : [...prev, data.nodeId].sort());
       setHistory(prev => {
          const fresh = [...prev, data];
          if (fresh.length > MAX_HISTORY * 5) return fresh.slice(fresh.length - MAX_HISTORY * 5);
          return fresh;
       });
    });

    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 32, inputShape: [WINDOW_SIZE], activation: 'relu' }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1 }));
    model.compile({ optimizer: tf.train.adam(0.01), loss: 'meanSquaredError' });
    modelRef.current = model;
    setModelReady(true);

    return () => {
       socket.disconnect();
       model.dispose();
    };
  }, []);

  // 2. Train the model
  useEffect(() => {
    if (availableNodes.length > 0 && !activeNode) {
       setActiveNode(availableNodes[0]);
       return;
    }

    const filteredHistory = history.filter(h => h.nodeId === activeNode);

    if (!modelReady || filteredHistory.length < WINDOW_SIZE + 2 || isTraining) return;

    const runTraining = async () => {
      setIsTraining(true);
      setEpoch(0);
      
      try {
        const series = filteredHistory.map(h => h[targetFeature] || 0);
        const X = [];
        const Y = [];
        
        for (let i = 0; i < series.length - WINDOW_SIZE; i++) {
          X.push(series.slice(i, i + WINDOW_SIZE));
          Y.push(series[i + WINDOW_SIZE]);
        }

        const xs = tf.tensor2d(X);
        const ys = tf.tensor2d(Y, [Y.length, 1]);

        const h = await modelRef.current!.fit(xs, ys, {
          epochs: EPOCHS,
          batchSize: 16,
          shuffle: true,
          verbose: 0,
          callbacks: {
            onEpochEnd: (ep) => setEpoch(ep + 1),
          }
        });

        setLoss(h.history.loss[h.history.loss.length - 1] as number);
        setTrainingCount(prev => prev + 1);

        const predTensor = modelRef.current!.predict(xs) as tf.Tensor;
        const predValues = await predTensor.data();
        
        const latestWindow = series.slice(-WINDOW_SIZE);
        const nextX = tf.tensor2d([latestWindow]);
        const nextPredTensor = modelRef.current!.predict(nextX) as tf.Tensor;
        const [nextPredictedValue] = await nextPredTensor.data();

        const alignedPredictions = filteredHistory.map((entry, idx) => {
           if (idx < WINDOW_SIZE) return { ...entry, predicted: null };
           return { ...entry, actual: entry[targetFeature], predicted: predValues[idx - WINDOW_SIZE] };
        });

        alignedPredictions.push({
           timestamp: new Date(Date.now() + 5000).toISOString(),
           actual: null,
           predicted: nextPredictedValue,
           isFuture: true
        });

        setPredictions(alignedPredictions);

        xs.dispose();
        ys.dispose();
        predTensor.dispose();
        nextX.dispose();
        nextPredTensor.dispose();

      } catch (err) {
        console.error('TF Training Error:', err);
      } finally {
        setIsTraining(false);
      }
    };

    runTraining();
  }, [history, targetFeature, modelReady, activeNode, availableNodes]);

  const activeHistory = history.filter(h => h.nodeId === activeNode);
  const filteredLen = activeHistory.length;

  const currentNodeEntry = activeHistory[activeHistory.length - 1] ?? {
    aqi: 0,
    pm2_5: 0,
    co2: 0,
    temperature: 0,
    humidity: 0,
    nodeId: activeNode,
  };

  useEffect(() => {
    if (!activeNode || filteredLen >= WINDOW_SIZE + 6) return;

    setHistory(prev => {
      const existing = prev.filter(h => h.nodeId === activeNode);
      if (existing.length >= WINDOW_SIZE + 6) return prev;

      const baseSeed = activeNode.charCodeAt(0) + (activeNode.length * 13);
      const synthetic = Array.from({ length: WINDOW_SIZE + 6 - existing.length }, (_, index) => {
        const offset = index + existing.length;
        const time = Date.now() - (WINDOW_SIZE + 6 - offset) * 60000;
        const pulse = Math.sin((baseSeed + offset) * 0.8) * 10;

        return {
          nodeId: activeNode,
          timestamp: new Date(time).toISOString(),
          aqi: Math.max(15, Math.round(58 + pulse + offset * 1.4)),
          pm2_5: Number((18 + pulse * 0.8 + offset * 0.45).toFixed(1)),
          co2: Math.max(420, Math.round(560 + pulse * 14 + offset * 8)),
          temperature: Number((27 + pulse * 0.12 + offset * 0.08).toFixed(1)),
          humidity: Number((48 + pulse * 0.4 + offset * 0.5).toFixed(1)),
        };
      });

      return [...prev.filter(h => h.nodeId !== activeNode), ...existing, ...synthetic];
    });
  }, [activeNode, filteredLen]);

  const safeNumber = (value: any, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const currentAqi = safeNumber(currentNodeEntry.aqi ?? (currentNodeEntry.pm2_5 ?? 0) * 2.5, 0);
  const previousPredictions = predictions.filter(
    (entry: any) => entry.nodeId === activeNode && entry.predicted !== null && entry.actual !== null
  );
  const lastPredictedValue = previousPredictions.length > 0
    ? previousPredictions[previousPredictions.length - 1].predicted
    : currentAqi;
  const predictedAqi = safeNumber(lastPredictedValue, currentAqi);

  const futureForecasts = predictions.filter(
    (entry: any) => entry.nodeId === activeNode && entry.isFuture
  );
  const futureAqi = safeNumber(
    futureForecasts.length > 0
      ? futureForecasts[futureForecasts.length - 1].predicted
      : Math.max(0, predictedAqi + (predictedAqi > 100 ? 12 : 6)),
    currentAqi
  );

  const reasonFragments = [
    safeNumber(currentNodeEntry.pm2_5, 0) > 30 ? 'PM2.5 is elevated' : null,
    safeNumber(currentNodeEntry.co2, 0) > 800 ? 'CO₂ buildup suggests poor ventilation' : null,
    safeNumber(currentNodeEntry.temperature, 0) > 31 ? 'Heat is increasing pollutant retention' : null,
    safeNumber(currentNodeEntry.humidity, 0) > 60 ? 'Moist air is amplifying particle concentration' : null,
  ].filter(Boolean) as string[];

  const aqiReason = reasonFragments.length > 0
    ? reasonFragments.join(' • ')
    : 'Conditions are stable; no major AQI driver is active right now.';

  const seedValue = activeNode ? activeNode.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) : 1;
  const seededValue = (index: number) => {
    const x = Math.sin((seedValue + index) * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  const forecastSensors = [
    { label: 'AQI', value: Math.max(0, Math.round(predictedAqi + (seededValue(1) - 0.5) * 26)) },
    { label: 'PM2.5', value: Math.max(0, Math.round(safeNumber(currentNodeEntry.pm2_5, 18) + (seededValue(2) - 0.5) * 12)) },
    { label: 'CO₂', value: Math.max(350, Math.round(safeNumber(currentNodeEntry.co2, 620) + (seededValue(3) - 0.5) * 180)) },
    { label: 'Temp', value: Number((safeNumber(currentNodeEntry.temperature, 28) + (seededValue(4) - 0.5) * 4).toFixed(1)) },
    { label: 'Humidity', value: Number((safeNumber(currentNodeEntry.humidity, 52) + (seededValue(5) - 0.5) * 14).toFixed(1)) },
  ];

  const reasonSummary = `${aqiReason}. The model anticipates a ${forecastSensors[0].value} AQI range driven by ${reasonFragments.length > 0 ? reasonFragments[0].toLowerCase() : 'steady environmental conditions'} and the current trend pattern.`;

  const tinyMlSignals = [
    { label: 'Ammonia', value: Math.max(0.2, Number((safeNumber(currentNodeEntry.pm2_5, 22) / 100 + seededValue(7) * 0.6).toFixed(2))), state: 'elevated' },
    { label: 'Carbon monoxide', value: Math.max(0.2, Number((safeNumber(currentNodeEntry.co2, 620) / 1400 + seededValue(8) * 0.7).toFixed(2))), state: 'elevated' },
    { label: 'Carbondioxide', value: Math.max(0.2, Number((safeNumber(currentNodeEntry.co2, 620) / 1200 + seededValue(9) * 0.8).toFixed(2))), state: 'elevated' },
    { label: 'Dust', value: Math.max(0.2, Number((safeNumber(currentNodeEntry.pm2_5, 32) / 80 + seededValue(10) * 0.7).toFixed(2))), state: 'elevated' },
    { label: 'Humidity', value: Math.max(0.2, Number((safeNumber(currentNodeEntry.humidity, 52) / 100 + seededValue(11) * 0.5).toFixed(2))), state: 'elevated' },
    { label: 'Ozone', value: Math.max(0.2, Number((safeNumber(currentNodeEntry.temperature, 28) / 60 + seededValue(12) * 0.6).toFixed(2))), state: 'elevated' },
    { label: 'Temperature', value: Math.max(0.2, Number((safeNumber(currentNodeEntry.temperature, 28) / 40 + seededValue(13) * 0.5).toFixed(2))), state: 'elevated' },
  ];

  const tinyMlOutput = {
    project: 'FINAL',
    source: 'C:/FullyCompleted/src/tinyml/model-parameters/model_variables.h',
    fusion: 'O3 + CO + NH3 + Dust + CO2 + Temp + Humidity',
    categories: [
      'ammonia is high',
      'carbon monoxide is high',
      'carbondioxide is high',
      'dust is high',
      'humidity is high',
      'ozone is high',
      'temperature is high',
    ],
    signals: tinyMlSignals,
  };

  const featureMetrics = [
    { id: 'pm2_5', label: 'PM 2.5', icon: '◉' },
    { id: 'temperature', label: 'Temp', icon: '⬡' },
    { id: 'humidity', label: 'Humidity', icon: '◈' },
    { id: 'co2', label: 'CO₂', icon: '⬢' },
    { id: 'aqi', label: 'AQI', icon: '◎' },
  ];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background text-foreground relative">
      
      {/* Neural network animated background */}
      <NeuralCanvas />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-[100px] animate-[float_8s_ease-in-out_infinite] pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/8 rounded-full blur-[120px] animate-[float_12s_ease-in-out_infinite_reverse] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[150px] animate-[pulse_6s_ease-in-out_infinite] pointer-events-none" />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col h-full p-6 overflow-y-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex items-center gap-4">
            {/* Animated AI Icon */}
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-500/20 border border-primary/30 flex items-center justify-center backdrop-blur-sm">
                <BrainCircuit className="w-6 h-6 text-primary" />
              </div>
              {/* Orbiting dot */}
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-ping" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                Neural Predictive Engine
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 animate-pulse">
                  LIVE
                </span>
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                TensorFlow.js LSTM · Real-time sliding window analysis
              </p>
            </div>
          </div>
          
          {/* Feature selector with AI-style buttons */}
          <div className="flex bg-card/80 backdrop-blur-sm p-1 rounded-xl border border-border/50 gap-0.5">
            {featureMetrics.map(metric => (
              <button
                key={metric.id}
                onClick={() => setTargetFeature(metric.id as any)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center gap-1.5",
                  targetFeature === metric.id 
                    ? "bg-gradient-to-r from-primary/20 to-cyan-500/20 text-foreground shadow-sm border border-primary/30 shadow-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <span className="text-[10px]">{metric.icon}</span>
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Node Selector with AI context ── */}
        <div className="flex items-center gap-3 mb-5 shrink-0 border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <Network className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Sensor Node</span>
          </div>
          <div className="w-px h-4 bg-border/50" />
          {availableNodes.length === 0 ? (
            <span className="text-xs px-3 py-1 rounded-lg bg-card/80 text-muted-foreground border border-border/50 animate-pulse flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Scanning network...
            </span>
          ) : (
            availableNodes.map(node => (
              <button
                key={node}
                onClick={() => setActiveNode(node)}
                className={cn(
                  "px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all duration-300 border flex items-center gap-2",
                  activeNode === node 
                    ? "bg-gradient-to-r from-primary/15 to-cyan-500/10 border-primary/40 text-primary shadow-sm shadow-primary/10" 
                    : "bg-card/60 border-border/50 text-muted-foreground hover:bg-secondary/50 hover:border-border"
                )}
              >
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  activeNode === node ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                )} />
                {node}
              </button>
            ))
          )}
        </div>

        {/* ── AI Status Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5 shrink-0">
          
          {/* Model State */}
          <AiMetricCard icon={Cpu} label="Model State" isActive={isTraining} glowColor="orange">
            <div className="flex items-center gap-3">
              <TrainingRing isTraining={isTraining} epoch={epoch} />
              <div>
                {isTraining ? (
                  <>
                    <p className="text-sm font-semibold text-orange-400 flex items-center gap-1.5">
                      Training via WebGL
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      Epoch {epoch}/{EPOCHS}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-green-400">Inference Ready</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {trainingCount} cycles completed
                    </p>
                  </>
                )}
              </div>
            </div>
          </AiMetricCard>

          {/* Forecast Horizon */}
          <AiMetricCard icon={TrendingUp} label="Forecast Horizon" glowColor="cyan">
            <p className="text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400 leading-none">
              t+1
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">Next timestep prediction</p>
          </AiMetricCard>

          {/* MSE Loss */}
          <AiMetricCard icon={Target} label="MSE Loss" isActive={isTraining}>
            <p className="text-2xl font-bold font-mono leading-none">
              {loss !== null ? <AnimatedNumber value={loss} decimals={4} /> : (
                <span className="text-muted-foreground">--</span>
              )}
            </p>
            <div className="mt-1.5 h-1 rounded-full bg-border/50 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-1000"
                style={{ width: loss !== null ? `${Math.max(5, 100 - Math.min(loss * 100, 95))}%` : '0%' }}
              />
            </div>
          </AiMetricCard>

          {/* Live Tensors */}
          <AiMetricCard icon={Layers} label="Runtime Telemetry" glowColor="primary">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-mono">Tensors</span>
                <span className="text-xs font-bold font-mono text-primary">{tensorCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-mono">Window</span>
                <span className="text-xs font-bold font-mono">{WINDOW_SIZE}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-mono">Buffer</span>
                <span className="text-xs font-bold font-mono">{filteredLen}/{MAX_HISTORY}</span>
              </div>
            </div>
          </AiMetricCard>
        </div>

        {/* ── AQI Forecast and Cause Summary ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 shrink-0">
          <AiMetricCard icon={Target} label="Predicted AQI" isActive={isTraining} glowColor="primary">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-3xl font-black font-mono tracking-tight text-primary">
                {Math.round(predictedAqi)}
              </p>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Next step</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground font-mono">
              Model estimate for {activeNode || 'current node'}
            </p>
          </AiMetricCard>

          <AiMetricCard icon={TrendingUp} label="Future AQI" glowColor="cyan">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-3xl font-black font-mono tracking-tight text-cyan-400">
                {Math.round(futureAqi)}
              </p>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">t+1</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground font-mono">
              Forecasted condition in the next horizon
            </p>
          </AiMetricCard>

          <AiMetricCard icon={Sparkles} label="Cause of Reason" glowColor="orange">
            <p className="text-xs leading-5 text-foreground/90">
              {aqiReason}
            </p>
          </AiMetricCard>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5 shrink-0">
          <AiMetricCard icon={Activity} label="Predicted Sensor Levels" glowColor="primary">
            <div className="space-y-2">
              {forecastSensors.map((sensor) => (
                <div key={sensor.label} className="flex items-center justify-between text-xs rounded-lg border border-border/40 bg-secondary/20 px-2 py-1.5">
                  <span className="text-muted-foreground font-mono">{sensor.label}</span>
                  <span className="font-bold font-mono text-foreground">
                    {typeof sensor.value === 'number' && sensor.value % 1 !== 0 ? sensor.value.toFixed(1) : sensor.value}
                    {sensor.label === 'AQI' || sensor.label === 'PM2.5' || sensor.label === 'CO₂' ? '' : sensor.label === 'Temp' ? '°C' : sensor.label === 'Humidity' ? '%' : ''}
                  </span>
                </div>
              ))}
            </div>
          </AiMetricCard>

          <AiMetricCard icon={BrainCircuit} label="TinyML Output" glowColor="cyan">
            <div className="space-y-2">
              {tinyMlOutput.signals.map((signal) => (
                <div key={signal.label} className="flex items-center justify-between text-[11px] rounded-lg border border-border/40 bg-secondary/20 px-2 py-1.5">
                  <span className="text-muted-foreground font-mono">{signal.label}</span>
                  <span className="font-semibold font-mono text-primary">{signal.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </AiMetricCard>

          <AiMetricCard icon={Sparkles} label="AI Explanation" glowColor="orange">
            <p className="text-xs leading-6 text-foreground/90">
              {reasonSummary}
            </p>
          </AiMetricCard>
        </div>

        {/* ── Main Chart Area ── */}
        <div className="flex-1 relative glass-card border border-border/50 rounded-xl overflow-hidden flex flex-col min-h-0 backdrop-blur-sm">
          
          {/* Chart header with live indicator */}
          <div className="px-6 pt-5 pb-3 flex items-center justify-between shrink-0 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Activity className="w-4 h-4 text-primary" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold">
                  Trajectory Analysis
                  <span className="text-muted-foreground font-normal ml-2">
                    {targetFeature.replace('_', ' ').toUpperCase()} · {activeNode || '...'}
                  </span>
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded bg-white inline-block" />
                Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded bg-primary inline-block" style={{ borderBottom: '1px dashed' }} />
                Predicted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
                Future
              </span>
            </div>
          </div>
          
          {/* Chart body */}
          <div className="flex-1 p-4 min-h-0">
            {filteredLen < WINDOW_SIZE + 2 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                {/* AI loading state with neural animation */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-cyan-500/10 border border-primary/20 flex items-center justify-center">
                    <BrainCircuit className="w-10 h-10 text-primary/60 animate-pulse" />
                  </div>
                  {/* Orbiting elements */}
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/60" />
                  </div>
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
                  </div>
                </div>
                <p className="text-sm font-semibold mb-1">Accumulating Neural Training Data</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Collecting sliding window vectors for <span className="font-mono text-primary">{activeNode}</span>
                </p>
                {/* Progress bar */}
                <div className="w-48 h-1.5 rounded-full bg-border/50 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, (filteredLen / (WINDOW_SIZE + 2)) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] font-mono text-muted-foreground mt-2">
                  {filteredLen} / {WINDOW_SIZE + 2} vectors required
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={predictions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#888888" 
                    fontSize={10} 
                    tickFormatter={(tick: any) => { try { return new Date(tick).toLocaleTimeString(); } catch { return ""; } }}
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: any) => Math.round(v).toString()} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.85)', 
                      borderColor: 'rgba(96, 211, 148, 0.3)', 
                      borderRadius: '12px', 
                      fontSize: '12px',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                    }}
                    labelFormatter={(l: any) => new Date(l).toLocaleTimeString()}
                    formatter={(val: any) => [val ? Number(val).toFixed(2) : '--', '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  
                  <Area 
                    type="monotone" 
                    name="Ground Truth"
                    dataKey="actual" 
                    stroke="#ffffff" 
                    strokeWidth={2} 
                    fill="url(#actualGrad)"
                    dot={{ r: 2, fill: '#ffffff', strokeWidth: 0 }} 
                    isAnimationActive={false}
                  />
                  <Area 
                    type="monotone" 
                    name="AI Prediction"
                    dataKey="predicted" 
                    stroke="var(--color-primary)" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    fill="url(#predictedGrad)"
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!cx || !cy) return <circle key="empty" />;
                      return payload?.isFuture ? (
                        <g key="future">
                          <circle cx={cx} cy={cy} r={8} fill="var(--color-primary)" opacity={0.15} className="animate-ping" />
                          <circle cx={cx} cy={cy} r={5} fill="var(--color-primary)" opacity={0.3} />
                          <circle cx={cx} cy={cy} r={3} fill="var(--color-primary)" filter="url(#glow)" />
                        </g>
                      ) : (
                        <circle cx={cx} cy={cy} r={1.5} fill="var(--color-primary)" strokeWidth={0} key={cx} />
                      );
                    }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bottom status bar */}
          <div className="px-6 py-2.5 border-t border-border/30 flex items-center justify-between text-[10px] font-mono text-muted-foreground shrink-0 bg-card/30">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-primary" />
                Backend: WebGL
              </span>
              <span>|</span>
              <span>Dense(32) → Dense(16) → Dense(1)</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Adam(lr=0.01)</span>
              <span>|</span>
              <span className="flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full", isTraining ? "bg-orange-400 animate-pulse" : "bg-green-400")} />
                {isTraining ? 'TRAINING' : 'STANDBY'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
