import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import NodeCard from './NodeCard';
import type { SystemAlert } from './AlertFeed';
import { Activity, Radio, AlertTriangle, TrendingUp, Wind, Thermometer, Cpu, Zap, CircuitBoard, Network, Gauge, ShieldCheck, Waves } from 'lucide-react';
import { cn } from '../lib/utils';

/* ═══════════════════════════════════════════════════════
   Grid Network Background Canvas  
   Matches the neural canvas aesthetic from Predictive page
   ═══════════════════════════════════════════════════════ */
function GridNetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

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

    const nodeCount = 45;
    const nodes: any[] = [];
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 1.5 + Math.random() * 2,
        pulsePhase: Math.random() * Math.PI * 2,
        type: Math.floor(Math.random() * 3), // 0=sensor, 1=hub, 2=router
      });
    }

    const typeColors = [
      'rgba(96, 211, 148, ',   // primary green (sensor)
      'rgba(56, 189, 248, ',   // cyan (hub)
      'rgba(251, 146, 60, ',   // orange (router)
    ];

    let frame = 0;

    const animate = () => {
      frame++;
      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;
      ctx.clearRect(0, 0, cw, ch);

      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > cw) node.vx *= -1;
        if (node.y < 0 || node.y > ch) node.vy *= -1;
        node.x = Math.max(0, Math.min(cw, node.x));
        node.y = Math.max(0, Math.min(ch, node.y));
      }

      // Draw connections
      const maxDist = 140;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.12;
            const pulseAlpha = Math.sin(frame * 0.015 + i * 0.5) * 0.5 + 0.5;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = typeColors[nodes[i].type] + (alpha * (0.4 + pulseAlpha * 0.6)) + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Data packet
            if (dist < 70 && frame % 4 === 0) {
              const t = (Math.sin(frame * 0.025 + i) * 0.5 + 0.5);
              const px = nodes[i].x + (nodes[j].x - nodes[i].x) * t;
              const py = nodes[i].y + (nodes[j].y - nodes[i].y) * t;
              ctx.beginPath();
              ctx.arc(px, py, 1, 0, Math.PI * 2);
              ctx.fillStyle = typeColors[nodes[i].type] + '0.5)';
              ctx.fill();
            }
          }
        }
      }

      // Draw nodes with glow
      for (const node of nodes) {
        const pulse = Math.sin(frame * 0.025 + node.pulsePhase) * 0.5 + 0.5;
        const r = node.radius * (1 + pulse * 0.25);

        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 3.5);
        gradient.addColorStop(0, typeColors[node.type] + (0.25 * pulse) + ')');
        gradient.addColorStop(1, typeColors[node.type] + '0)');
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = typeColors[node.type] + (0.5 + pulse * 0.4) + ')';
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
      style={{ opacity: 0.35 }}
    />
  );
}

/* ═══════════════════════════════════════════════════════
   Data Pipeline Shimmer (matches Predictive page)
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
   Enhanced KPI Card – premium, with glow & pipeline  
   ═══════════════════════════════════════════════════════ */
function KpiCard({ label, value, sub, icon, accent, glowColor = 'primary', isLive = false }: {
  label: string;
  value: string;
  sub?: string;
  icon: import('react').ReactNode;
  accent: 'primary' | 'destructive';
  glowColor?: string;
  isLive?: boolean;
}) {
  return (
    <div className="group relative glass-card rounded-xl p-5 overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10 border border-border">
      {/* Top shimmer pipeline */}
      <DataPipeline isActive={isLive} />

      {/* Corner circuitry decoration */}
      <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-25 transition-opacity duration-500">
        <CircuitBoard className="w-7 h-7 text-primary" />
      </div>

      {/* Background glow */}
      <div className={cn(
        "absolute -bottom-6 -right-6 w-20 h-20 rounded-full blur-2xl transition-opacity duration-1000",
        isLive ? "opacity-20" : "opacity-5",
        glowColor === 'orange' ? 'bg-orange-500' : glowColor === 'cyan' ? 'bg-cyan-500' : glowColor === 'red' ? 'bg-red-500' : 'bg-primary'
      )} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            {label}
          </p>
          <div className={cn(
            "p-1.5 rounded-md transition-all duration-300",
            accent === 'destructive'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-gradient-to-br from-primary/15 to-cyan-500/15 text-primary border border-primary/20'
          )}>
            {icon}
          </div>
        </div>
        <p className={cn(
          "text-2xl font-bold tracking-tight tabular-nums font-mono",
          accent === 'destructive'
            ? 'text-destructive'
            : 'text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/80'
        )}>
          {value}
        </p>
        {sub && (
          <p className="text-[10px] text-muted-foreground mt-1.5 font-mono flex items-center gap-1">
            <TrendingUp className="w-2.5 h-2.5" />
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN DASHBOARD PAGE
   ═══════════════════════════════════════════════════════ */
export default function Dashboard({
  globalAlerts,
  onAlertsChange,
  onNodesChange,
  onStatusChange,
  thresholds: _thresholds,
}: {
  globalAlerts?: SystemAlert[];
  onAlertsChange?: (alerts: SystemAlert[]) => void;
  onNodesChange?: (nodes: Record<string, any>) => void;
  onStatusChange?: (status: Record<string, any>) => void;
  thresholds?: { aqi: number; pm25: number; co: number; co2: number };
}) {
  const [nodesData, setNodesData]       = useState<Record<string, any>>({});
  const [nodesStatus, setNodesStatus]   = useState<Record<string, any>>({});
  const [nodesHistory, setNodesHistory] = useState<Record<string, any[]>>({});
  const [alerts, setAlerts]             = useState<SystemAlert[]>([]);

  const randomRange = (min: number, max: number) => min + (Math.random() * (max - min));
  const buildDemoTelemetry = (nodeId: string) => {
    const isWorker = nodeId.startsWith('worker_');
    const pm25 = Number(randomRange(0.3, 0.5).toFixed(2));
    const co = Number(randomRange(0.2, 0.3).toFixed(2));
    const temperature = Number(randomRange(26, 34).toFixed(1));
    const humidity = Number(randomRange(45, 65).toFixed(1));
    const co2 = Number(randomRange(isWorker ? 500 : 450, isWorker ? 700 : 650).toFixed(0));
    const aqi = Number(randomRange(50, 55).toFixed(0));

    return {
      nodeId,
      aqi,
      pm2_5: pm25,
      pm10: Number((pm25 * 1.7).toFixed(2)),
      co,
      co2,
      temperature,
      humidity,
      timestamp: new Date().toISOString(),
    };
  };

  useEffect(() => {
    const socket = io('http://localhost:5000', { reconnectionAttempts: 3, timeout: 2000 });

    socket.on('node_data', (data) => {
      const formattedData = {
        nodeId:      data.nodeId,
        aqi:         data.aqi ?? Math.round((data.pm25 ?? 0) * 2.5),
        pm2_5:       data.pm25        ?? 0,
        pm10:        data.pm10        ?? 0,
        co:          data.co          ?? 0,
        co2:         data.co2         ?? 0,
        temperature: data.temperature ?? 0,
        humidity:    data.humidity    ?? 0,
        timestamp:   data.timestamp,
      };

      setNodesData(prev => {
        const next = { ...prev, [formattedData.nodeId]: formattedData };
        onNodesChange?.(next);
        return next;
      });
      setNodesStatus(prev => {
        const next = { ...prev, [formattedData.nodeId]: { status: 'online' } };
        onStatusChange?.(next);
        return next;
      });
      setNodesHistory(prev => {
        const hist = prev[formattedData.nodeId] || [];
        return { ...prev, [formattedData.nodeId]: [...hist.slice(-19), formattedData] };
      });
    });

    socket.on('node_status', (data) => {
      setNodesStatus(prev => {
        const next = { ...prev, [data.nodeId]: data };
        onStatusChange?.(next);
        return next;
      });
    });

    socket.on('new_alert', (alert: SystemAlert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50));
      onAlertsChange?.([alert, ...(globalAlerts || [])].slice(0, 100));
    });

    let mockInterval: ReturnType<typeof setInterval>;

    socket.on('connect_error', () => {
      if (Object.keys(nodesData).length === 0) startMockEngine();
    });

    const fallbackTimer = window.setTimeout(() => {
      if (Object.keys(nodesData).length === 0) startMockEngine();
    }, 1500);

    const startMockEngine = () => {
      setNodesStatus({
        'alpha-001': { nodeId: 'alpha-001', status: 'online' },
        'beta-002':  { nodeId: 'beta-002',  status: 'offline' },
        'gamma-003': { nodeId: 'gamma-003', status: 'offline' },
      });

      setAlerts([
        { id: '1', nodeId: 'alpha-001', message: 'PM2.5 elevated above 35 µg/m³ — moderate air quality warning.', severity: 'warning', timestamp: new Date().toISOString() },
        { id: '2', nodeId: 'gamma-003', message: 'Node offline — no heartbeat received for >5 minutes.', severity: 'critical', timestamp: new Date(Date.now() - 300000).toISOString() },
        { id: '3', nodeId: 'beta-002', message: 'CO₂ within safe operational range.', severity: 'info', timestamp: new Date(Date.now() - 60000).toISOString() },
      ]);

      let alpha = buildDemoTelemetry('alpha-001');
      let beta = buildDemoTelemetry('beta-002');
      const gamma = buildDemoTelemetry('gamma-003');

      const ts = () => new Date().toISOString();

      const pushHistory = (nodeId: string, d: any) =>
        setNodesHistory(prev => {
          const h = prev[nodeId] || [];
          return { ...prev, [nodeId]: [...h.slice(-19), { ...d, nodeId, timestamp: ts() }] };
        });

      // Prime history
      Array.from({ length: 20 }).forEach(() => { pushHistory('alpha-001', alpha); pushHistory('beta-002', beta); });

      mockInterval = setInterval(() => {
        alpha = buildDemoTelemetry('alpha-001');
        beta = buildDemoTelemetry('beta-002');

        const alphaNode = { ...alpha, nodeId: 'alpha-001', timestamp: ts() };
        const betaNode = { ...beta, nodeId: 'beta-002', timestamp: ts() };
        const gammaNode = { ...gamma, nodeId: 'gamma-003', timestamp: new Date(Date.now() - 360000).toISOString() };

        setNodesData({ 'alpha-001': alphaNode, 'beta-002': betaNode, 'gamma-003': gammaNode });
        pushHistory('alpha-001', alpha);
        pushHistory('beta-002', beta);
      }, 120000);
    };

    return () => { window.clearTimeout(fallbackTimer); socket.disconnect(); if (mockInterval) clearInterval(mockInterval); };
  }, [nodesData]);

  const outdoorNodesData = Object.fromEntries(Object.entries(nodesData).filter(([id]) => !id.startsWith('worker_')));
  const nodeKeys        = Object.keys(outdoorNodesData);
  const connectedNodes  = Object.values(nodesStatus).filter(n => n.status !== 'offline' && !n.nodeId?.startsWith('worker_')).length;
  const totalNodes      = Math.max(connectedNodes, nodeKeys.length);
  const avgAqi          = nodeKeys.length > 0
    ? Math.round(Object.values(outdoorNodesData).reduce((s, n) => s + n.aqi, 0) / nodeKeys.length)
    : 0;
  const avgTemp         = nodeKeys.length > 0
    ? (Object.values(outdoorNodesData).reduce((s, n) => s + (n.temperature || 0), 0) / nodeKeys.length).toFixed(1)
    : '--';
  const criticalAlerts  = alerts.filter(a => a.severity === 'critical').length;

  const getAqiLabel = (v: number) =>
    v <= 50  ? 'Good'      :
    v <= 100 ? 'Moderate'  :
    v <= 150 ? 'Sensitive' :
    v <= 200 ? 'Unhealthy' : 'Hazardous';


  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background text-foreground relative">

      {/* Animated network canvas background */}
      <GridNetworkCanvas />

      {/* Floating gradient orbs */}
      <div className="absolute top-16 left-8 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-[float_10s_ease-in-out_infinite] pointer-events-none" />
      <div className="absolute bottom-16 right-16 w-80 h-80 bg-cyan-500/8 rounded-full blur-[120px] animate-[float_14s_ease-in-out_infinite_reverse] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[150px] animate-[pulse_8s_ease-in-out_infinite] pointer-events-none" />

      {/* Content layer */}
      <div className="relative z-10 flex-1 flex flex-col overflow-y-auto">



        {/* ── Header ── */}
        <div className="shrink-0 px-8 pt-6 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              {/* Animated icon */}
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-500/20 border border-primary/30 flex items-center justify-center backdrop-blur-sm">
                  <Gauge className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-ping" />
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  System Overview
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 animate-pulse">
                    LIVE
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Fleet Monitoring · Real-time sensor telemetry
                </p>
              </div>
            </div>

            {/* Network health summary pills */}
            <div className="flex bg-card/80 backdrop-blur-sm p-1 rounded-xl border border-border/50 gap-0.5">
              <div className="px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 bg-gradient-to-r from-primary/15 to-cyan-500/10 text-primary border border-primary/20">
                <Network className="w-3 h-3" />
                {connectedNodes} Online
              </div>
              <div className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5",
                criticalAlerts > 0
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : "text-muted-foreground"
              )}>
                <ShieldCheck className="w-3 h-3" />
                {criticalAlerts > 0 ? `${criticalAlerts} Critical` : 'All Clear'}
              </div>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Active Nodes"
              value={`${connectedNodes} / ${totalNodes}`}
              sub={`${connectedNodes === totalNodes ? 'All nodes reporting' : `${totalNodes - connectedNodes} offline`}`}
              icon={<Radio className="w-4 h-4" />}
              accent="primary"
              glowColor="cyan"
              isLive={connectedNodes > 0}
            />
            <KpiCard
              label="Fleet Avg AQI"
              value={avgAqi > 0 ? avgAqi.toString() : '--'}
              sub={avgAqi > 0 ? getAqiLabel(avgAqi) : undefined}
              icon={<Wind className="w-4 h-4" />}
              accent={avgAqi > 100 ? 'destructive' : 'primary'}
              glowColor={avgAqi > 100 ? 'red' : 'primary'}
              isLive={avgAqi > 0}
            />
            <KpiCard
              label="Avg Temperature"
              value={avgTemp !== '--' ? `${avgTemp} °C` : '--'}
              sub={avgTemp !== '--' ? 'Ambient reading' : undefined}
              icon={<Thermometer className="w-4 h-4" />}
              accent="primary"
              glowColor="orange"
              isLive={avgTemp !== '--'}
            />
            <KpiCard
              label="Active Alerts"
              value={criticalAlerts.toString()}
              sub={criticalAlerts > 0 ? 'Require attention' : 'All clear'}
              icon={<AlertTriangle className="w-4 h-4" />}
              accent={criticalAlerts > 0 ? 'destructive' : 'primary'}
              glowColor={criticalAlerts > 0 ? 'red' : 'primary'}
              isLive={criticalAlerts > 0}
            />
          </div>
        </div>

        {/* Section header */}
        <div className="px-8 pb-3 flex items-center justify-between border-b border-border/30 mb-4 mx-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Waves className="w-4 h-4 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Sensor Nodes</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                {nodeKeys.length} device{nodeKeys.length !== 1 ? 's' : ''} detected on network
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
              Live Feed
            </span>
            <span>|</span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" />
              Updates every 3s
            </span>
          </div>
        </div>

        {/* Node Grid */}
        <div className="flex-1 px-8 pb-8">
          {(() => {
            const onlineEntries = Object.entries(outdoorNodesData).filter(
              ([nodeId]) => (nodesStatus[nodeId]?.status || 'online') !== 'offline'
            );
            if (onlineEntries.length === 0) {
              return (
                <div className="h-64 glass-card rounded-xl flex flex-col items-center justify-center gap-3 border border-border/50 backdrop-blur-sm relative overflow-hidden">
                  <DataPipeline isActive={true} />
                  <div className="relative mb-2">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-cyan-500/10 border border-primary/20 flex items-center justify-center">
                      <Activity className="w-8 h-8 text-primary/60 animate-pulse" />
                    </div>
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/60" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">Scanning for sensor nodes...</p>
                  <p className="text-[10px] text-muted-foreground font-mono">Awaiting telemetry stream connection</p>
                  <div className="w-40 h-1.5 rounded-full bg-border/50 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 animate-[shimmer_2s_ease-in-out_infinite] w-1/2" />
                  </div>
                </div>
              );
            }
            if (onlineEntries.length === 1) {
              const [nodeId, data] = onlineEntries[0];
              return (
                <div className="w-full max-w-6xl mx-auto">
                  <NodeCard
                    key={nodeId}
                    data={data}
                    status={nodesStatus[nodeId] || { status: 'online' }}
                    history={nodesHistory[nodeId] || []}
                    variant="horizontal"
                  />
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {onlineEntries.map(([nodeId, data]) => (
                  <NodeCard
                    key={nodeId}
                    data={data}
                    status={nodesStatus[nodeId] || { status: 'online' }}
                    history={nodesHistory[nodeId] || []}
                  />
                ))}
              </div>
            );
          })()}
        </div>

        {/* Bottom Status Bar */}
        <div className="px-8 py-2.5 border-t border-border/30 flex items-center justify-between text-[10px] font-mono text-muted-foreground shrink-0 bg-card/30 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-primary" />
              Protocol: MQTT → WebSocket
            </span>
            <span>|</span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-cyan-400" />
              PIC32 Telemetry Pipeline
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>{nodeKeys.length} nodes · {alerts.length} alerts queued</span>
            <span>|</span>
            <span className="flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", connectedNodes > 0 ? "bg-green-400 animate-pulse" : "bg-muted-foreground")} />
              {connectedNodes > 0 ? 'STREAMING' : 'IDLE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
