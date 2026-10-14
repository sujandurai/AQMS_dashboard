import { useState, useEffect, useRef } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis,
  BarChart, Bar, Cell
} from 'recharts';
import { AlertOctagon, Activity, FileDown, DatabaseBackup, Clock, ShieldAlert, CircuitBoard, Zap, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';

/* ═══════════════════════════════════════════════════════
   Animated Data Grid Background
   ═══════════════════════════════════════════════════════ */
function DataGridCanvas() {
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

    const nodeCount = 40;
    const nodes: any[] = [];
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        radius: 1.5 + Math.random() * 1.5, pulsePhase: Math.random() * Math.PI * 2,
        type: Math.floor(Math.random() * 3),
      });
    }

    const colors = ['rgba(239, 68, 68, ', 'rgba(249, 115, 22, ', 'rgba(234, 179, 8, '];
    let frame = 0;

    const animate = () => {
      frame++;
      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;
      ctx.clearRect(0, 0, cw, ch);

      for (const node of nodes) {
        node.x += node.vx; node.y += node.vy;
        if (node.x < 0 || node.x > cw) node.vx *= -1;
        if (node.y < 0 || node.y > ch) node.vy *= -1;
        node.x = Math.max(0, Math.min(cw, node.x));
        node.y = Math.max(0, Math.min(ch, node.y));
      }

      const maxDist = 130;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = colors[nodes[i].type] + alpha + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        const pulse = Math.sin(frame * 0.025 + node.pulsePhase) * 0.5 + 0.5;
        const r = node.radius * (1 + pulse * 0.25);
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 3);
        gradient.addColorStop(0, colors[node.type] + (0.2 * pulse) + ')');
        gradient.addColorStop(1, colors[node.type] + '0)');
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = colors[node.type] + (0.4 + pulse * 0.4) + ')';
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.3 }} />;
}

/* ═══════════════════════════════════════════════════════
   Data Pipeline Shimmer
   ═══════════════════════════════════════════════════════ */
function DataPipeline({ isActive }: { isActive: boolean }) {
  return (
    <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden rounded-t-xl">
      <div className={cn(
        "h-full rounded-full transition-all duration-700",
        isActive
          ? "bg-gradient-to-r from-transparent via-red-500 to-transparent animate-[shimmer_2s_ease-in-out_infinite]"
          : "bg-gradient-to-r from-transparent via-red-500/30 to-transparent"
      )} />
    </div>
  );
}

export default function AnalyticsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/nodes/fleet/anomalies')
      .then(r => r.json())
      .then(data => {
        setEvents(data || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch events from PostgreSQL', err);
        setEvents([{
          id: 'demo-1', node_id: 'alpha-001', event_category: 'CRITICAL_AQI_SPIKE', aqi: 185, pm2_5: 90, timestamp: new Date(Date.now() - 3600000).toISOString()
        }, {
          id: 'demo-2', node_id: 'worker_01_john', event_category: 'HAZARDOUS_GAS_DETECTED', aqi: 80, co2_ppm: 1400, timestamp: new Date(Date.now() - 7200000).toISOString()
        }]);
        setIsLoading(false);
      });
  }, []);

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: '12px', fontSize: '11px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(8px)',
    },
    itemStyle: { color: 'var(--color-foreground)', fontWeight: 500 },
  };

  const axisProps = { stroke: '#888888', fontSize: 10, tickLine: false, axisLine: false };

  const scatterData = events.map(e => ({
    x: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }),
    y: e.aqi || e.co2_ppm / 10 || 100,
    z: e.aqi ? e.aqi * 2 : 100,
    name: e.node_id,
    category: e.event_category,
    raw: e
  })).reverse();

  const barData = Object.values(
    events.reduce((acc, e) => {
       if (!acc[e.node_id]) acc[e.node_id] = { node: e.node_id, Count: 0 };
       acc[e.node_id].Count += 1;
       return acc;
    }, {})
  ).sort((a: any, b: any) => b.Count - a.Count);

  const critCount = events.filter(e => e.event_category === 'CRITICAL_AQI_SPIKE').length;
  const gasCount = events.filter(e => e.event_category === 'HAZARDOUS_GAS_DETECTED').length;
  const offlineCount = events.filter(e => e.event_category === 'NODE_OFFLINE_DROP').length;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background text-foreground relative">
      
      {/* Animated background */}
      <DataGridCanvas />
      
      {/* Gradient orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-red-500/10 rounded-full blur-[100px] animate-[float_10s_ease-in-out_infinite] pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-orange-500/8 rounded-full blur-[120px] animate-[float_14s_ease-in-out_infinite_reverse] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-yellow-500/5 rounded-full blur-[150px] animate-[pulse_8s_ease-in-out_infinite] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-6 space-y-6 w-full">

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/30">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center backdrop-blur-sm">
                  <DatabaseBackup className="w-6 h-6 text-red-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  Relational Anomaly Log
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 animate-pulse">
                    LIVE
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  PostgreSQL Event-Driven Critical Threat Storage · 24h Window
                </p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 border border-red-500/30 hover:shadow-lg hover:shadow-red-500/10 transition-all">
              <FileDown className="w-3.5 h-3.5" /> Export DB Ledger
            </button>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: AlertOctagon, label: 'Critical AQI Spikes', count: critCount, color: 'red', glow: 'bg-red-500' },
              { icon: Activity, label: 'Hazardous Gas Hits', count: gasCount, color: 'orange', glow: 'bg-orange-500' },
              { icon: Clock, label: 'Offline Blackouts', count: offlineCount, color: 'yellow', glow: 'bg-yellow-500' },
            ].map(({ icon: Icon, label, count, color, glow }) => (
              <div key={label} className="group relative glass-card rounded-xl p-5 overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-lg border border-border">
                <DataPipeline isActive={count > 0} />
                <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-25 transition-opacity duration-500">
                  <CircuitBoard className="w-7 h-7 text-primary" />
                </div>
                <div className={cn("absolute -bottom-6 -right-6 w-20 h-20 rounded-full blur-2xl transition-opacity duration-1000", count > 0 ? "opacity-20" : "opacity-5", glow)} />
                <div className="relative z-10">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </p>
                  <p className={cn("text-2xl font-mono font-bold", 
                    color === 'red' ? 'text-red-500' : color === 'orange' ? 'text-orange-500' : 'text-yellow-500'
                  )}>{count}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bar Chart */}
          <div className="group relative glass-card rounded-xl p-6 overflow-hidden border border-border/50 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-primary/5">
            <DataPipeline isActive={barData.length > 0} />
            <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <CircuitBoard className="w-8 h-8 text-orange-400" />
            </div>
            <div className="relative z-10 mb-5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Activity className="w-4 h-4 text-orange-400" />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Node Condition Reliability</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Critical anomalies per node · Higher = Worse Condition</p>
                </div>
              </div>
            </div>
            <div className="h-48 mt-4 relative z-10">
              {barData.length === 0 && !isLoading ? (
                 <div className="w-full h-full flex items-center justify-center text-xs font-mono text-muted-foreground border border-dashed border-border/50 rounded-xl">
                   ALL NODES OPERATING NOMINALLY
                 </div>
              ) : (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                     <XAxis dataKey="node" {...axisProps} tickFormatter={(tick: any) => String(tick).split('-').pop() || String(tick)} />
                     <YAxis dataKey="Count" {...axisProps} allowDecimals={false} />
                     <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} {...tooltipStyle as any} />
                     <Bar dataKey="Count" radius={[4, 4, 0, 0]}>
                       {barData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.Count > 5 ? '#ef4444' : entry.Count > 2 ? '#f97316' : 'var(--color-primary)'} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Scatter Chart */}
          <div className="group relative glass-card rounded-xl p-6 overflow-hidden border border-border/50 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-primary/5">
            <DataPipeline isActive={scatterData.length > 0} />
            <div className="relative z-10 mb-5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Anomaly Constellation Map</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Pressure events across 24h database threshold window</p>
                </div>
              </div>
            </div>
            <div className="h-64 mt-4 relative z-10">
              {isLoading ? (
                 <div className="w-full h-full flex items-center justify-center">
                   <div className="flex flex-col items-center gap-3 text-muted-foreground">
                     <div className="relative">
                       <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 flex items-center justify-center">
                         <ShieldAlert className="w-8 h-8 text-red-400/60 animate-pulse" />
                       </div>
                       <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                         <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500/60" />
                       </div>
                     </div>
                     <p className="text-[10px] font-mono tracking-widest uppercase">Querying Relational Database...</p>
                   </div>
                 </div>
              ) : scatterData.length === 0 ? (
                 <div className="w-full h-full flex items-center justify-center text-xs font-mono text-muted-foreground border border-dashed border-border/50 rounded-xl">
                   NO ANOMALIES DETECTED IN POSTGRES DB
                 </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                   <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                   <XAxis dataKey="x" name="Time" {...axisProps} />
                   <YAxis dataKey="y" name="Intensity" {...axisProps} />
                   <ZAxis dataKey="z" range={[50, 400]} name="Magnitude" />
                   <Tooltip 
                     cursor={{ strokeDasharray: '3 3' }} 
                     {...tooltipStyle}
                     content={(props: any) => {
                       const { active, payload } = props;
                       if (active && payload && payload.length) {
                         const d = payload[0].payload.raw;
                         return (
                           <div className="bg-black/85 border border-border/50 p-3 rounded-xl shadow-xl text-xs max-w-[200px] backdrop-blur-sm">
                             <p className="font-bold text-foreground mb-1">{d.node_id}</p>
                             <p className={cn("text-[9px] font-mono tracking-wider px-1.5 py-0.5 inline-block rounded uppercase mb-2", 
                               d.event_category.includes('AQI') ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'
                             )}>{d.event_category}</p>
                             <div className="grid grid-cols-2 gap-2 mt-1">
                               <div><span className="text-muted-foreground block text-[9px]">AQI</span> <span className="font-mono">{d.aqi || '--'}</span></div>
                               <div><span className="text-muted-foreground block text-[9px]">CO2</span> <span className="font-mono">{d.co2_ppm || '--'}</span></div>
                             </div>
                           </div>
                         );
                       }
                       return null;
                     }}
                   />
                   <Scatter name="Anomalies" data={scatterData} fill="#ef4444" opacity={0.6} activeShape={{ opacity: 1 }}/>
                 </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Database Ledger Table */}
          <div className="group relative glass-card rounded-xl p-0 overflow-hidden border border-border/50 backdrop-blur-sm">
            <DataPipeline isActive={events.length > 0} />
            <div className="p-5 border-b border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Cpu className="w-4 h-4 text-primary" />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">PostgreSQL Active Ledger</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Raw table output from `critical_sensor_events` selection</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/40 text-[10px] text-muted-foreground uppercase tracking-widest border-b border-border/50">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Timestamp</th>
                    <th className="px-5 py-3 font-semibold">Node Origin</th>
                    <th className="px-5 py-3 font-semibold">Anomaly Category</th>
                    <th className="px-5 py-3 font-semibold text-right">AQI</th>
                    <th className="px-5 py-3 font-semibold text-right">CO₂ (ppm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {events.map((e, idx) => (
                    <tr key={e.id || idx} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-4 font-mono text-muted-foreground whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                      <td className="px-5 py-4 font-medium text-foreground">{e.node_id}</td>
                      <td className="px-5 py-4 text-[10px]">
                         <span className={cn("px-2 py-0.5 rounded-full font-bold uppercase", 
                            e.event_category === 'NODE_OFFLINE_DROP' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 
                            e.event_category === 'CRITICAL_AQI_SPIKE' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                            'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                         )}>
                           {e.event_category}
                         </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-right font-medium">{e.aqi || '—'}</td>
                      <td className="px-5 py-4 font-mono text-right text-muted-foreground">{e.co2_ppm || '—'}</td>
                    </tr>
                  ))}
                  {events.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground italic">No anomalies stored in DB.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Bottom Status Bar */}
        <div className="px-8 py-2.5 border-t border-border/30 flex items-center justify-between text-[10px] font-mono text-muted-foreground shrink-0 bg-card/30 backdrop-blur-sm mt-auto">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-red-400" />
              PostgreSQL · Event-Driven Storage
            </span>
            <span>|</span>
            <span>critical_sensor_events table</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{events.length} anomalies logged</span>
            <span>|</span>
            <span className="flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", events.length > 0 ? "bg-red-400 animate-pulse" : "bg-green-400")} />
              {events.length > 0 ? 'THREATS DETECTED' : 'ALL CLEAR'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
