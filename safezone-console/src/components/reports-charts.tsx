"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { Card, PanelTitle, CardContent } from "@/components/ui/card";
import { CHART, CHART_SERIES } from "@/lib/constants";

/**
 * Charts are held to the same rule as the rest of the console: color is
 * information. Every mark here is painted from a semantic token, so a chart
 * cannot introduce a hue the UI does not already mean. (The old pie shipped a
 * hardcoded #8A5CC0 — a purple that meant nothing.)
 *
 * Colors are CSS variables rather than hex, so the charts follow the theme
 * toggle without a re-render.
 */

const AXIS = {
  tick: { fontSize: 11, fill: CHART.axis },
  stroke: CHART.grid,
  tickLine: false,
} as const;

const TOOLTIP = {
  contentStyle: {
    background: CHART.surface,
    border: `1px solid ${CHART.grid}`,
    borderRadius: 2,
    fontSize: 12,
    color: CHART.ink,
  },
  cursor: { fill: CHART.grid, fillOpacity: 0.4 },
} as const;

function Panel({ lo, en, children }: { lo: string; en: string; children: React.ReactNode }) {
  return (
    <Card>
      <PanelTitle lo={lo} en={en} />
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportsCharts({
  byType,
  byMonth,
  byCountry,
  respTrend,
}: {
  byType: { name: string; value: number }[];
  byMonth: { name: string; value: number }[];
  byCountry: { name: string; value: number }[];
  respTrend: { name: string; value: number }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel lo="ເຫດການ ຕາມ ປະເພດ" en="By type">
        <PieChart>
          <Pie data={byType} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={1} stroke={CHART.surface}>
            {byType.map((_, i) => (
              <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP} />
        </PieChart>
      </Panel>

      <Panel lo="ເຄສ ຕໍ່ ເດືອນ" en="Cases per month">
        <BarChart data={byMonth}>
          {/* Hairline horizontals only. Swiss keeps the grid, drops the dashes. */}
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="name" {...AXIS} />
          <YAxis {...AXIS} axisLine={false} width={32} />
          <Tooltip {...TOOLTIP} />
          {/* Squared bars. Rounded bar caps are decoration. */}
          <Bar dataKey="value" fill={CHART.medium} />
        </BarChart>
      </Panel>

      <Panel lo="ຕາມ ປະເທດ" en="By country">
        <BarChart data={byCountry} layout="vertical">
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis type="number" {...AXIS} />
          <YAxis type="category" dataKey="name" width={90} {...AXIS} axisLine={false} />
          <Tooltip {...TOOLTIP} />
          <Bar dataKey="value" fill={CHART.success} />
        </BarChart>
      </Panel>

      <Panel lo="ເວລາ ຕອບໂຕ້ (ນາທີ)" en="Response time trend">
        <LineChart data={respTrend}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="name" {...AXIS} />
          <YAxis {...AXIS} axisLine={false} width={32} />
          <Tooltip {...TOOLTIP} />
          {/* Falling response time is the good story, so the line is emerald,
              not amber. The color states the conclusion. */}
          <Line type="linear" dataKey="value" stroke={CHART.success} strokeWidth={2} dot={{ r: 2, fill: CHART.success }} />
        </LineChart>
      </Panel>
    </div>
  );
}
