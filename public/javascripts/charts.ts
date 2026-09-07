// Declarative SVG charts for posts.
//
// Write markup, not code. Every chart is a <figure data-chart="..."> with its
// data in a data attribute; this file finds them on load and draws them.
//
//   <figure class="chart" data-chart="bars"
//           data-panels='[{"title":"2024","max":18,"series":[["Hello Interview",18]]}]'
//           data-colour="tube">
//     <figcaption>What the bars mean.</figcaption>
//   </figure>
//
// Types: bars (labelled horizontal bars, 1-2 panels)
//        columns (small multiples, one stacked column pair per panel)
//        rows (day-by-day timeline, one row per series)
//        lines (a measure over time, one smoothed line per series)
//
// Colours come from --chart-1..5 in charts.scss; name them by slot or alias.

import { select } from 'd3-selection';
import type { Selection } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { max } from 'd3-array';
import { line, curveMonotoneX } from 'd3-shape';
import { axisBottom, axisLeft } from 'd3-axis';

type Svg = Selection<SVGSVGElement, unknown, null, undefined>;

type BarPanel = {
  title?: string;
  max?: number;
  labelWidth?: number;
  fade?: boolean;
  series: [string, number][];
};

type ColumnSeries = { label: string; colour?: string };
type ColumnPanel = {
  title: string;
  format?: 'comma';
  columns: { label: string; values: number[] }[];
};

type StackPart = { label: string; colour?: string; fade?: boolean; values: number[] };
type RowSeries = { label: string; max: number; peak: string; unit?: string; stack: StackPart[] };
type Marker = { index: number; label: string };

type LineSeries = {
  label: string;
  colour?: string;
  values: number[];
  labelAt?: number;
  labelBelow?: boolean;
};

type LegendItem = { label: string; colour?: string; fade?: boolean };

const WIDTH = 760;

// Posts name an entity rather than a colour slot, so the palette can be retuned in
// charts.scss without touching the markup.
const ALIAS: Record<string, number> = { claude: 1, gpt: 2, browse: 3, tube: 4, search: 5 };

const colour = (name?: string): string => {
  if (!name) return 'var(--chart-1)';
  return `var(--chart-${ALIAS[name] ?? name})`;
};

const data = <T>(figure: Element, key: string, fallback: T): T => {
  const raw = figure.getAttribute(`data-${key}`);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
};

/** A bar plus the hover text screen readers and mouse users both get. */
const mark = (
  svg: Svg,
  attrs: Record<string, string | number>,
  fill: string,
  opacity: string,
  title: string,
): void => {
  const rect = svg.append('rect').attr('class', 'chart-mark').attr('fill', fill).attr('rx', 2);
  Object.entries(attrs).forEach(([key, value]) => rect.attr(key, value));
  rect.attr('opacity', opacity);
  rect.append('title').text(title);
};

const label = (
  svg: Svg,
  str: string | number,
  cls: string,
  x: number,
  y: number,
  anchor?: string,
) => {
  const node = svg.append('text').attr('class', cls).attr('x', x).attr('y', y).text(String(str));
  if (anchor) node.attr('text-anchor', anchor);
  return node;
};

const gridLine = (svg: Svg, x1: number, x2: number, y1: number, y2: number, cls = 'chart-grid') =>
  svg.append('line').attr('class', cls).attr('x1', x1).attr('x2', x2).attr('y1', y1).attr('y2', y2);

const svgFor = (figure: Element, height: number): Svg => {
  const scroller = document.createElement('div');
  scroller.className = 'chart-scroller';
  figure.insertBefore(scroller, figure.firstChild);

  return select(scroller)
    .append('svg')
    .attr('viewBox', `0 0 ${WIDTH} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', figure.getAttribute('data-alt') ?? 'chart');
};

const legend = (figure: Element, items: LegendItem[]): void => {
  if (!items.length) return;
  const box = select(figure).insert('div', ':first-child').attr('class', 'chart-legend');
  items.forEach((item) => {
    const span = box.append('span');
    const swatch = span.append('i').style('background', colour(item.colour));
    if (item.fade) swatch.style('opacity', '.55');
    span.node()?.appendChild(document.createTextNode(item.label));
  });
};

// ---------------------------------------------------------------- bars
// Labelled horizontal bars. One or two panels sharing a scale.
const bars = (figure: Element): void => {
  const panels = data<BarPanel[]>(figure, 'panels', []);
  const fill = colour(data<string>(figure, 'colour', 'claude'));
  const rowCount = max(panels, (panel) => panel.series.length) ?? 0;
  const height = 34 + rowCount * 26 + 10;
  const svg = svgFor(figure, height);
  const colWidth = WIDTH / panels.length;

  panels.forEach((panel, index) => {
    const x0 = index * colWidth;
    const labelWidth = panel.labelWidth ?? 168;
    const barLeft = x0 + 8 + labelWidth;
    const opacity = panel.fade ? '.55' : '1';

    // A shared `max` across panels is what makes two panels comparable; a per-panel
    // one is deliberate when the post says the scales differ.
    const x = scaleLinear()
      .domain([0, panel.max ?? max(panel.series, (row) => row[1]) ?? 0])
      .range([0, colWidth - labelWidth - 46]);

    const y = scaleBand<number>()
      .domain(panel.series.map((_, i) => i))
      .range([30, 30 + panel.series.length * 26]);

    if (panel.title) label(svg, panel.title.toUpperCase(), 'chart-panel-title', x0 + 8, 14);

    panel.series.forEach((row, i) => {
      const top = y(i) ?? 0;
      label(svg, row[0], 'chart-label', barLeft - 10, top + 12, 'end');

      // A zero-length bar reads as a missing row rather than a real zero.
      const w = Math.max(x(row[1]), 3);
      mark(
        svg,
        { x: barLeft, y: top + 2, width: w, height: 13 },
        fill,
        opacity,
        `${row[0]}: ${row[1]}`,
      );
      label(svg, row[1], 'chart-value', barLeft + w + 7, top + 13);
    });
  });
};

// ---------------------------------------------------------------- columns
// Small multiples: each panel is its own measure, each column a stacked total.
const columns = (figure: Element): void => {
  const panels = data<ColumnPanel[]>(figure, 'panels', []);
  const series = data<ColumnSeries[]>(figure, 'series', []);
  const height = 200;
  const top = 30;
  const inner = height - top - 34;
  const svg = svgFor(figure, height);
  const colWidth = WIDTH / panels.length;
  const barWidth = 40;
  const gap = 26;

  legend(
    figure,
    series.map((s) => ({ label: s.label, colour: s.colour })),
  );

  panels.forEach((panel, index) => {
    const x0 = index * colWidth;
    const startX = x0 + 24;
    if (index) gridLine(svg, x0, x0, 4, height - 34 + 8);
    label(svg, panel.title.toUpperCase(), 'chart-panel-title', x0 + 20, 14);

    const totals = panel.columns.map((col) => col.values.reduce((a, b) => a + b, 0));

    // Headroom above the tallest column so the total label has somewhere to sit.
    const y = scaleLinear()
      .domain([0, (max(totals) ?? 0) * 1.3])
      .range([0, inner]);

    panel.columns.forEach((col, j) => {
      const x = startX + j * (barWidth + gap);
      let cursor = top + inner;

      col.values.forEach((value, k) => {
        if (value <= 0) return;
        const h = Math.max(y(value), 3);
        cursor -= h;
        mark(
          svg,
          { x, y: cursor, width: barWidth, height: h, rx: 3 },
          colour(series[k]?.colour),
          '1',
          `${col.label} · ${series[k]?.label ?? ''}: ${value}`,
        );
        cursor -= 2;
      });

      const sum = totals[j] ?? 0;
      const total = panel.format === 'comma' ? sum.toLocaleString() : sum;
      label(svg, total, 'chart-total', x + barWidth / 2, cursor - 6, 'middle');
      label(svg, col.label, 'chart-axis', x + barWidth / 2, top + inner + 14, 'middle');
    });

    gridLine(svg, startX - 8, startX + 2 * barWidth + gap + 8, top + inner, top + inner);
  });
};

// ---------------------------------------------------------------- rows
// A day-by-day timeline: one row per measure, each on its own scale.
const rows = (figure: Element): void => {
  const dates = data<string[]>(figure, 'dates', []);
  const series = data<RowSeries[]>(figure, 'series', []);
  const markers = data<Marker[]>(figure, 'markers', []);
  const labelWidth = Number(data<number>(figure, 'labelwidth', 96));
  const rowHeight = 72;
  const gap = 30;
  const height = 18 + series.length * (rowHeight + gap) + 10;
  const svg = svgFor(figure, height);

  const x = scaleBand<string>()
    .domain(dates)
    .range([labelWidth, WIDTH - 12])
    .paddingInner(0.18);

  legend(
    figure,
    series.flatMap((row) =>
      row.stack.map((part) => ({ label: part.label, colour: part.colour, fade: part.fade })),
    ),
  );

  series.forEach((row, index) => {
    const top = 18 + index * (rowHeight + gap);

    // Each row carries its own `max` — the units differ, so a shared scale would be
    // a lie. The peak is printed next to the label to say so.
    const y = scaleLinear().domain([0, row.max]).range([0, rowHeight]);

    gridLine(svg, labelWidth, WIDTH - 12, top, top);
    gridLine(svg, labelWidth, WIDTH - 12, top + rowHeight, top + rowHeight);
    label(svg, row.label.toUpperCase(), 'chart-row-label', 0, top + 12);
    label(svg, `peak ${row.peak}${row.unit ?? ''}`, 'chart-axis', 0, top + 26);

    dates.forEach((date, i) => {
      let cursor = top + rowHeight;
      row.stack.forEach((part) => {
        const value = part.values[i];
        if (!value) return;
        const h = Math.max(y(value), 2);
        cursor -= h;
        mark(
          svg,
          { x: x(date) ?? 0, y: cursor, width: x.bandwidth(), height: h },
          colour(part.colour),
          part.fade ? '.55' : '1',
          `${date} — ${value}${row.unit ?? ''} ${part.label}`,
        );
        cursor -= 1.5;
      });
    });

    // Dates only under the bottom row, every third one, or they collide.
    if (index === series.length - 1) {
      dates.forEach((date, i) => {
        if (i % 3) return;
        const centre = (x(date) ?? 0) + x.bandwidth() / 2;
        label(svg, date, 'chart-axis', centre, top + rowHeight + 14, 'middle');
      });
    }
  });

  markers.forEach((marker) => {
    const centre = (x(dates[marker.index] ?? '') ?? 0) + x.bandwidth() / 2;
    gridLine(svg, centre, centre, 20, height - 24, 'chart-marker');
    label(svg, marker.label, 'chart-annotation', centre + 5, 14);
  });
};

// ---------------------------------------------------------------- lines
// A measure over time: one smoothed line per series, with real axes.
const lines = (figure: Element): void => {
  const categories = data<string[]>(figure, 'x', []);
  const series = data<LineSeries[]>(figure, 'series', []);
  const yTitle = figure.getAttribute('data-ylabel') ?? '';
  const xTitle = figure.getAttribute('data-xlabel') ?? '';
  const height = 380;
  const margin = { top: 18, right: 18, bottom: 46, left: 62 };
  const innerWidth = WIDTH - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = svgFor(figure, height);
  const plot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  legend(
    figure,
    series.map((s) => ({ label: s.label, colour: s.colour })),
  );

  const x = scaleBand<string>().domain(categories).range([0, innerWidth]);
  const y = scaleLinear()
    .domain([0, max(series.flatMap((s) => s.values)) ?? 0])
    .range([innerHeight, 0])
    .nice();

  // Band centres, so points sit over their tick rather than its left edge.
  const centre = (i: number): number => (x(categories[i] ?? '') ?? 0) + x.bandwidth() / 2;

  y.ticks(8).forEach((tick) => {
    plot
      .append('line')
      .attr('class', 'chart-grid')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', y(tick))
      .attr('y2', y(tick));
  });

  plot
    .append('g')
    .attr('class', 'chart-axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(axisBottom(x));
  plot
    .append('g')
    .attr('class', 'chart-axis')
    .call(
      axisLeft(y)
        .ticks(8)
        .tickFormat((value) => value.toLocaleString()),
    );

  if (xTitle) {
    label(svg, xTitle, 'chart-panel-title', margin.left + innerWidth / 2, height - 6, 'middle');
  }
  if (yTitle) {
    svg
      .append('text')
      .attr('class', 'chart-panel-title')
      .attr('transform', `translate(14,${margin.top + innerHeight / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .text(yTitle);
  }

  const path = line<number>()
    .x((_, i) => centre(i))
    .y((value) => y(value))
    .curve(curveMonotoneX);

  series.forEach((s) => {
    const stroke = colour(s.colour);
    plot
      .append('path')
      .attr('class', 'chart-line')
      .attr('d', path(s.values))
      .attr('fill', 'none')
      .attr('stroke', stroke);

    s.values.forEach((value, i) => {
      plot
        .append('circle')
        .attr('class', 'chart-point')
        .attr('cx', centre(i))
        .attr('cy', y(value))
        .attr('r', 4)
        .attr('fill', stroke)
        .append('title')
        .text(`${categories[i]} — ${value.toLocaleString()}`);
    });

    // One in-chart label per line, so the lines can be told apart without
    // crossing back to the legend. The post picks the year with room for it.
    if (s.labelAt !== undefined) {
      const offset = s.labelBelow ? 22 : -14;
      plot
        .append('text')
        .attr('class', 'chart-line-label')
        .attr('x', centre(s.labelAt))
        .attr('y', y(s.values[s.labelAt] ?? 0) + offset)
        .attr('text-anchor', 'middle')
        .attr('fill', stroke)
        .text(s.label);
    }
  });
};

const TYPES: Record<string, (figure: Element) => void> = { bars, columns, rows, lines };

export const drawCharts = (): void => {
  document.querySelectorAll('[data-chart]').forEach((figure) => {
    if (figure.getAttribute('data-drawn')) return;
    const renderer = TYPES[figure.getAttribute('data-chart') ?? ''];
    if (!renderer) return;
    renderer(figure);
    figure.setAttribute('data-drawn', 'true');
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', drawCharts);
} else {
  drawCharts();
}
