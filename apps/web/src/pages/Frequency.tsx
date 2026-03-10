import { useState } from 'react';
import { useLifts, groupByDay, calcFatigue, getSleepProgression, getSleepStats } from '../lib/useLifts';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CELL_SIZE = 14;
const CELL_GAP = 3;

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function getColor(tonnage: number, maxTonnage: number): string {
  if (tonnage === 0) return 'rgba(128,128,128,0.1)';
  const ratio = tonnage / maxTonnage;
  if (ratio > 0.75) return '#4caf50';
  if (ratio > 0.5) return '#66bb6a';
  if (ratio > 0.25) return '#81c784';
  return '#a5d6a7';
}

export default function Frequency() {
  const { entries, loading } = useLifts();
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  if (loading) return <p className="text-text-muted">Loading...</p>;

  const sessions = groupByDay(entries);
  if (sessions.length === 0) return <p>No session data.</p>;

  const tonnageMap = new Map<string, number>();
  const liftMap = new Map<string, string[]>();
  for (const s of sessions) {
    tonnageMap.set(s.date, s.tonnage);
    liftMap.set(s.date, Object.keys(s.liftTonnage));
  }
  const maxTonnage = Math.max(...sessions.map((s) => s.tonnage), 1);

  const today = new Date();
  const weeksToShow = 16;
  const startMonday = getMonday(addDays(today, -(weeksToShow - 1) * 7));
  const weeks: Date[][] = [];
  let current = new Date(startMonday);
  for (let w = 0; w < weeksToShow; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) { week.push(new Date(current)); current = addDays(current, 1); }
    weeks.push(week);
  }

  const totalSessions = sessions.length;
  const totalDays = Math.max(1, Math.round((today.getTime() - new Date(sessions[0]?.date || today).getTime()) / 86400000));
  const sessionsPerWeek = (totalSessions / totalDays * 7).toFixed(1);

  let streak = 0;
  let d = new Date(today);
  while (true) {
    const key = formatDate(d);
    if (tonnageMap.has(key)) { streak++; d = addDays(d, -1); }
    else if (formatDate(d) === formatDate(today)) { d = addDays(d, -1); }
    else { break; }
  }

  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  let lastCol = -Infinity;
  weeks.forEach((week, wi) => {
    const m = week[0].getMonth();
    if (m !== lastMonth && wi - lastCol >= 3) { monthLabels.push({ label: MONTHS[m], col: wi }); lastMonth = m; lastCol = wi; }
  });

  const hoveredInfo = hoveredDay ? { date: hoveredDay, tonnage: tonnageMap.get(hoveredDay) || 0, lifts: liftMap.get(hoveredDay) || [] } : null;
  const fatigue = calcFatigue(entries);

  return (
    <div>
      <h2>Training Frequency</h2>

      <div className="flex gap-6 mb-6 flex-wrap">
        <div className="stat-card"><div className="label">Total Sessions</div><div className="value">{totalSessions}</div></div>
        <div className="stat-card"><div className="label">Sessions / Week</div><div className="value">{sessionsPerWeek}</div></div>
        <div className="stat-card"><div className="label">Current Streak</div><div className="value">{streak} day{streak !== 1 ? 's' : ''}</div></div>
      </div>

      {fatigue ? (
        <div className="flex items-center gap-4 flex-wrap rounded-lg p-3 mb-6"
          style={{ border: `1px solid ${fatigue.color}40`, backgroundColor: `${fatigue.color}15` }}>
          <div>
            <div className="text-xs opacity-60">Recovery Status</div>
            <div className="text-lg font-bold" style={{ color: fatigue.color }}>{fatigue.label}</div>
          </div>
          <div className="text-sm opacity-75">
            ACWR: <strong>{fatigue.acwr}</strong>
            <span className="mx-2">|</span>Acute: {(fatigue.acuteEWMA / 1000).toFixed(1)} tons
            <span className="mx-2">|</span>Chronic: {(fatigue.chronicEWMA / 1000).toFixed(1)} tons
          </div>
        </div>
      ) : (
        <div className="p-2 rounded-md bg-bg-card mb-6 text-sm opacity-60">Fatigue tracking requires 3+ weeks of data</div>
      )}

      <div className="overflow-x-auto">
        <svg width={weeks.length * (CELL_SIZE + CELL_GAP) + 40} height={7 * (CELL_SIZE + CELL_GAP) + 30} style={{ fontSize: '10px' }}>
          {monthLabels.map((m) => <text key={m.col} x={40 + m.col * (CELL_SIZE + CELL_GAP)} y={10} fill="var(--color-text-muted)">{m.label}</text>)}
          {[1, 3, 5].map((di) => <text key={di} x={0} y={22 + di * (CELL_SIZE + CELL_GAP) + CELL_SIZE * 0.75} fill="var(--color-text-muted)" fontSize="10">{DAYS[di]}</text>)}
          {weeks.map((week, wi) => week.map((day, di) => {
            const key = formatDate(day);
            const tonnage = tonnageMap.get(key) || 0;
            const isFuture = day > today;
            return (
              <rect key={key} x={40 + wi * (CELL_SIZE + CELL_GAP)} y={20 + di * (CELL_SIZE + CELL_GAP)}
                width={CELL_SIZE} height={CELL_SIZE} rx={2}
                fill={isFuture ? 'transparent' : getColor(tonnage, maxTonnage)}
                stroke={hoveredDay === key ? '#fff' : 'none'} strokeWidth={hoveredDay === key ? 1.5 : 0}
                style={{ cursor: isFuture ? 'default' : 'pointer' }}
                onMouseEnter={() => !isFuture && setHoveredDay(key)}
                onMouseLeave={() => setHoveredDay(null)}
              />
            );
          }))}
        </svg>
      </div>

      {hoveredInfo && (
        <div className="text-sm mt-2 opacity-80">
          <strong>{hoveredInfo.date}</strong>
          {hoveredInfo.tonnage > 0
            ? ` — ${(hoveredInfo.tonnage / 1000).toFixed(1)} tons total (${hoveredInfo.lifts.join(', ')})`
            : ' — Rest day'}
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-3 text-xs opacity-75">
        <span>Less</span>
        {['rgba(128,128,128,0.1)', '#a5d6a7', '#81c784', '#66bb6a', '#4caf50'].map((c, i) => (
          <span key={i} className="inline-block rounded-sm" style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>

      <SleepChart entries={entries} />
    </div>
  );
}

function getSleepColor(hours: number): string {
  if (hours >= 8) return '#66bb6a';
  if (hours >= 7) return '#81c784';
  if (hours >= 6) return '#ffa726';
  return '#ef5350';
}

function SleepChart({ entries }: { entries: import('../lib/types').LiftEntry[] }) {
  const sleepData = getSleepProgression(entries);
  const sleepStats = getSleepStats(entries);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  if (sleepData.length === 0) return null;

  // Show last 30 data points
  const data = sleepData.slice(-30);
  const maxSleep = Math.max(...data.map(d => d.sleep), 10);
  const barWidth = 16;
  const gap = 3;
  const chartHeight = 120;
  const chartWidth = data.length * (barWidth + gap) + 40;

  return (
    <div className="mt-8">
      <h3 className="mb-3">Sleep Tracking</h3>

      {sleepStats && (
        <div className="flex gap-6 mb-4 flex-wrap">
          <div className="stat-card">
            <div className="label">Avg (7d)</div>
            <div className="value" style={{ color: sleepStats.avg7d >= 7 ? '#66bb6a' : sleepStats.avg7d >= 6 ? '#ffa726' : '#ef5350' }}>
              {sleepStats.avg7d}h
            </div>
          </div>
          <div className="stat-card">
            <div className="label">Avg (30d)</div>
            <div className="value">{sleepStats.avg30d}h</div>
          </div>
          <div className="stat-card">
            <div className="label">Overall</div>
            <div className="value">{sleepStats.average}h</div>
          </div>
          <div className="stat-card">
            <div className="label">Last Night</div>
            <div className="value">{sleepStats.latest}h</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight + 30} style={{ fontSize: '9px' }}>
          {/* 7h reference line */}
          <line
            x1={30} x2={chartWidth}
            y1={chartHeight - (7 / maxSleep) * chartHeight}
            y2={chartHeight - (7 / maxSleep) * chartHeight}
            stroke="rgba(102,187,106,0.3)" strokeDasharray="4,3"
          />
          <text x={0} y={chartHeight - (7 / maxSleep) * chartHeight + 3} fill="var(--color-text-muted)">7h</text>

          {data.map((d, i) => {
            const barHeight = (d.sleep / maxSleep) * chartHeight;
            const x = 30 + i * (barWidth + gap);
            const y = chartHeight - barHeight;
            return (
              <g key={d.date}
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={x} y={y} width={barWidth} height={barHeight}
                  rx={2} fill={getSleepColor(d.sleep)}
                  opacity={hoveredBar === i ? 1 : 0.8}
                />
                {/* Date label every 5 bars */}
                {i % 5 === 0 && (
                  <text x={x + barWidth / 2} y={chartHeight + 12} fill="var(--color-text-muted)" textAnchor="middle">
                    {d.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {hoveredBar !== null && data[hoveredBar] && (
        <div className="text-sm mt-1 opacity-80">
          <strong>{data[hoveredBar].date}</strong> — {data[hoveredBar].sleep}h sleep
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-2 text-xs opacity-75">
        {[
          { color: '#ef5350', label: '<6h' },
          { color: '#ffa726', label: '6-7h' },
          { color: '#81c784', label: '7-8h' },
          { color: '#66bb6a', label: '8h+' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="inline-block rounded-sm" style={{ width: 10, height: 10, backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
