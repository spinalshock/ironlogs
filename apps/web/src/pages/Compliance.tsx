import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useLifts } from '../lib/useLifts';
import { getComplianceData, getComplianceSummary } from '../lib/analytics';
import type { ComplianceData } from '../lib/analytics';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function rateColor(rate: number): string {
  if (rate >= 100) return '#66bb6a';
  if (rate >= 80) return '#ffa726';
  return '#ef5350';
}

function effortColor(effort: number): string {
  if (effort > 4) return '#66bb6a';
  if (effort >= 2) return '#ffa726';
  return '#ef5350';
}

export default function Compliance() {
  const { entries, loading } = useLifts();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  if (loading) return <p className="text-text-muted">Loading...</p>;

  const complianceData = getComplianceData(entries);
  const summary = getComplianceSummary(entries);

  if (complianceData.length === 0) return <p>No session data for compliance tracking.</p>;

  // Most recent first for the table
  const sortedData = [...complianceData].reverse();

  // Last 20 sessions for the bar chart (chronological order)
  const chartSessions = complianceData.slice(-20);

  // AMRAP data for line chart (sessions with AMRAP effort, chronological)
  const amrapSessions = complianceData.filter((d) => d.amrapEffort !== null);

  return (
    <div>
      <h2>Program Compliance</h2>

      {/* Summary Stats */}
      <div className="flex gap-6 mb-6 flex-wrap">
        <div className="stat-card">
          <div className="label">Avg T1 Completion</div>
          <div className="value" style={{ color: rateColor(summary.avgT1Rate) }}>{summary.avgT1Rate}%</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg T2 Completion</div>
          <div className="value" style={{ color: rateColor(summary.avgT2Rate) }}>{summary.avgT2Rate}%</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg AMRAP Effort</div>
          <div className="value">{summary.avgAmrapEffort} reps</div>
        </div>
        <div className="stat-card">
          <div className="label">Full Completion</div>
          <div className="value" style={{ color: rateColor(summary.fullCompletionRate) }}>{summary.fullCompletionRate}%</div>
        </div>
      </div>

      {/* Compliance Timeline */}
      <h3 className="mb-3">Compliance Timeline</h3>
      <ComplianceBarChart sessions={chartSessions} hoveredBar={hoveredBar} setHoveredBar={setHoveredBar} />

      {hoveredBar !== null && chartSessions[hoveredBar] && (
        <div className="text-sm mt-2 opacity-80">
          <strong>{chartSessions[hoveredBar].date}</strong> — {chartSessions[hoveredBar].dayLabel}
          {' | T1: '}{chartSessions[hoveredBar].t1Completed}/{chartSessions[hoveredBar].t1Programmed}
          {' | T2: '}{chartSessions[hoveredBar].t2Completed}/{chartSessions[hoveredBar].t2Programmed}
          {chartSessions[hoveredBar].amrapEffort !== null && ` | AMRAP: ${chartSessions[hoveredBar].amrapEffort} reps`}
        </div>
      )}

      <div className="flex items-center gap-3 mt-2 text-xs opacity-75">
        <span className="flex items-center gap-1">
          <span className="inline-block rounded-sm" style={{ width: 10, height: 10, backgroundColor: '#1abc9c' }} />
          T1 Rate
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block rounded-sm" style={{ width: 10, height: 10, backgroundColor: '#3498db' }} />
          T2 Rate
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block rounded-sm" style={{ width: 10, height: 10, backgroundColor: 'rgba(255,255,255,0.3)' }} />
          100% target
        </span>
      </div>

      {/* AMRAP Effort Over Time */}
      {amrapSessions.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3">AMRAP Effort Over Time</h3>
          <AmrapLineChart sessions={amrapSessions} />
        </div>
      )}

      {/* Session Detail Table */}
      <div className="mt-8">
        <h3 className="mb-3">Session Details</h3>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>T1</th>
                <th>T2</th>
                <th>AMRAP</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td>{d.dayLabel}</td>
                  <td style={{ color: rateColor(d.t1Rate) }}>
                    {d.t1Completed}/{d.t1Programmed} ({d.t1Rate}%)
                  </td>
                  <td style={{ color: d.t2Completed > 0 ? rateColor(d.t2Rate) : 'var(--color-text-muted)' }}>
                    {d.t2Completed > 0 ? `${d.t2Completed}/${d.t2Programmed} (${d.t2Rate}%)` : '—'}
                  </td>
                  <td style={{ color: d.amrapEffort !== null ? effortColor(d.amrapEffort) : 'var(--color-text-muted)' }}>
                    {d.amrapEffort !== null ? `${d.amrapEffort} reps` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ComplianceBarChart({
  sessions,
  hoveredBar,
  setHoveredBar,
}: {
  sessions: ComplianceData[];
  hoveredBar: number | null;
  setHoveredBar: (i: number | null) => void;
}) {
  const barWidth = 12;
  const gap = 4;
  const groupGap = 6;
  const chartHeight = 140;
  const leftPad = 30;
  const topPad = 10;
  const chartWidth = sessions.length * (barWidth * 2 + gap + groupGap) + leftPad + 10;

  return (
    <div className="overflow-x-auto">
      <svg width={chartWidth} height={chartHeight + topPad + 30} style={{ fontSize: '9px' }}>
        {/* Y-axis labels */}
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <text x={leftPad - 4} y={topPad + chartHeight - (v / 100) * chartHeight + 3} fill="var(--color-text-muted)" textAnchor="end">
              {v}%
            </text>
            <line
              x1={leftPad}
              x2={chartWidth}
              y1={topPad + chartHeight - (v / 100) * chartHeight}
              y2={topPad + chartHeight - (v / 100) * chartHeight}
              stroke={v === 100 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.07)'}
              strokeDasharray={v === 100 ? '4,3' : undefined}
            />
          </g>
        ))}

        {sessions.map((s, i) => {
          const x = leftPad + i * (barWidth * 2 + gap + groupGap);
          const t1Height = Math.min(s.t1Rate, 120) / 100 * chartHeight;
          const t2Height = Math.min(s.t2Rate, 120) / 100 * chartHeight;
          const isHovered = hoveredBar === i;

          return (
            <g
              key={s.date}
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* T1 bar */}
              <rect
                x={x}
                y={topPad + chartHeight - t1Height}
                width={barWidth}
                height={t1Height}
                rx={2}
                fill="#1abc9c"
                opacity={isHovered ? 1 : 0.8}
              />
              {/* T2 bar */}
              <rect
                x={x + barWidth + gap}
                y={topPad + chartHeight - t2Height}
                width={barWidth}
                height={t2Height}
                rx={2}
                fill="#3498db"
                opacity={isHovered ? 1 : 0.8}
              />
              {/* Date label every 4 sessions */}
              {i % 4 === 0 && (
                <text
                  x={x + barWidth}
                  y={topPad + chartHeight + 14}
                  fill="var(--color-text-muted)"
                  textAnchor="middle"
                >
                  {s.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function AmrapLineChart({ sessions }: { sessions: ComplianceData[] }) {
  const labels = sessions.map((s) => s.date.slice(5));
  const efforts = sessions.map((s) => s.amrapEffort!);

  const pointColors = efforts.map((e) => effortColor(e));

  const data = {
    labels,
    datasets: [
      {
        label: 'AMRAP Effort (reps)',
        data: efforts,
        borderColor: '#1abc9c',
        backgroundColor: 'rgba(26, 188, 156, 0.1)',
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointBorderWidth: 2,
      },
    ],
  };

  return (
    <Line
      data={data}
      options={{
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (ctx: any) => {
                const s = sessions[ctx.dataIndex];
                return `${s.dayLabel} — ${s.t1Lift}`;
              },
            },
          },
        },
        scales: {
          y: {
            title: { display: true, text: 'Reps on 1+ Set' },
            beginAtZero: true,
          },
          x: {
            title: { display: true, text: 'Session' },
          },
        },
      }}
    />
  );
}
