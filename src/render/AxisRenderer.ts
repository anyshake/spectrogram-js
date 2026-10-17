import { SpectrogramModel } from '../core/SpectrogramModel';

export interface AxisLabelStyle {
    color?: string;
    // Font size in CSS pixels.
    fontSize?: number;
    fontWeight?: string | number;
    fontFamily?: string;
}

export interface AxisOptions {
    // Hides the axis line, ticks, labels, and title when false. Defaults to true.
    visible?: boolean;
    // Color and width of the axis line and ticks. Width is in CSS pixels.
    color?: string;
    lineWidth?: number;
    // Applies to tick labels and the axis title.
    labelStyle?: AxisLabelStyle;
}

export class AxisRenderer {
    private model: SpectrogramModel;

    constructor(model: SpectrogramModel) {
        this.model = model;
    }

    private applyStyle(ctx: CanvasRenderingContext2D, options: AxisOptions) {
        const fontSize = options.labelStyle?.fontSize ?? 11;
        const fontWeight = options.labelStyle?.fontWeight ?? 'normal';
        const fontFamily = options.labelStyle?.fontFamily ?? 'AxisFont';

        ctx.strokeStyle = options.color ?? '#464646';
        ctx.lineWidth = options.lineWidth ?? 1;
        ctx.fillStyle = options.labelStyle?.color ?? '#252525';
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

        return fontSize;
    }

    private formatTime(timeRel: number, tEnd: number) {
        const totalSeconds = this.model.startTime + timeRel * 1000;
        if (this.model.showRealTimeScale) {
            const date = new Date(totalSeconds);
            const hh = date.getHours().toString().padStart(2, '0');
            const mm = date.getMinutes().toString().padStart(2, '0');
            const ss = date.getSeconds().toString().padStart(2, '0');
            return `${hh}:${mm}:${ss}`;
        }
        return totalSeconds >= 0 ? `${Math.floor(tEnd - totalSeconds / 1000)}s` : '';
    }

    private formatFrequency(freq: number) {
        return freq % 1 !== 0 ? freq.toFixed(1).replace(/\.0$/, '') : freq.toString();
    }

    private getFrequencyTicks(freqRange: [number, number], plotH: number, fontSize: number) {
        const [fMin, fMax] = freqRange;
        const freqSpan = fMax - fMin;
        if (freqSpan <= 0) {
            return [];
        }

        const targetTicks = Math.max(1, Math.floor(plotH / Math.max(40, fontSize * 2)));
        const rawStep = freqSpan / targetTicks;
        const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
        const residual = rawStep / magnitude;
        let niceStep = magnitude;

        if (residual > 5) {
            niceStep = 10 * magnitude;
        } else if (residual > 2) {
            niceStep = 5 * magnitude;
        } else if (residual > 1) {
            niceStep = 2 * magnitude;
        }

        const safeStep = niceStep || 1;
        const startTick = Math.floor(fMax / safeStep) * safeStep;
        const endTick = Math.floor(fMin / safeStep) * safeStep;
        const epsilon = safeStep / 1000;
        const ticks: number[] = [];

        for (let freq = startTick; freq >= endTick; freq -= safeStep) {
            if (freq <= fMax + epsilon && freq >= fMin - epsilon) {
                ticks.push(freq);
            }
        }

        return ticks;
    }

    getMargins(
        ctx: CanvasRenderingContext2D,
        height: number,
        timeRange: [number, number],
        freqRange: [number, number],
        xAxis: AxisOptions = {},
        yAxis: AxisOptions = {}
    ) {
        ctx.save();
        let left = 0;
        let bottom = 0;
        let top = 0;
        let right = 0;

        if (xAxis.visible !== false) {
            const fontSize = this.applyStyle(ctx, xAxis);
            const [tStart, tEnd] = timeRange;
            const linePadding = ctx.lineWidth / 2;
            left = Math.ceil(
                ctx.measureText(this.formatTime(tStart, tEnd)).width / 2 + linePadding
            );
            right = Math.max(
                32,
                Math.ceil(ctx.measureText(this.formatTime(tEnd, tEnd)).width / 2 + linePadding)
            );
            bottom = Math.max(30, Math.ceil(8 + linePadding + fontSize * 1.2));
        }

        if (yAxis.visible !== false) {
            const fontSize = this.applyStyle(ctx, yAxis);
            const linePadding = ctx.lineWidth / 2;
            top = Math.max(12, Math.ceil(fontSize * 0.6 + linePadding));
            bottom = Math.max(bottom, Math.ceil(fontSize * 0.6 + linePadding));

            const ticks = this.getFrequencyTicks(freqRange, height - top - bottom, fontSize);
            let labelWidth = 0;
            for (const freq of ticks) {
                labelWidth = Math.max(
                    labelWidth,
                    ctx.measureText(this.formatFrequency(freq)).width
                );
            }

            const titleX = Math.max(10, fontSize / 2 + 2);
            left = Math.max(
                left,
                50,
                Math.ceil(titleX + fontSize / 2 + labelWidth + 16 + linePadding)
            );
        }

        ctx.restore();
        return { left, bottom, top, right };
    }

    draw(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        timeRange: [number, number],
        freqRange: [number, number],
        margins: { left: number; bottom: number; top: number; right: number },
        xAxis: AxisOptions = {},
        yAxis: AxisOptions = {}
    ) {
        // Save context state
        ctx.save();

        const [tStart, tEnd] = timeRange;
        const [fMin, fMax] = freqRange;
        const duration = tEnd - tStart;
        const { left, bottom, top, right } = margins;

        const plotX = left;
        const plotY = top;
        const plotW = width - left - right;
        const plotH = height - bottom - top;

        if (duration <= 0 || plotW <= 0 || plotH <= 0) {
            ctx.restore();
            return;
        }

        const bottomY = plotY + plotH;
        if (xAxis.visible !== false) {
            this.applyStyle(ctx, xAxis);
            ctx.textBaseline = 'top';
            ctx.textAlign = 'center';

            // X-axis line and time ticks.
            ctx.beginPath();
            ctx.moveTo(left, bottomY);
            ctx.lineTo(left + plotW, bottomY);
            ctx.stroke();

            const labelWidth = Math.max(
                ctx.measureText(this.formatTime(tStart, tEnd)).width,
                ctx.measureText(this.formatTime(tEnd, tEnd)).width
            );
            const numTicksX = Math.max(1, Math.floor(plotW / Math.max(100, labelWidth + 16)));
            const stepX = duration / numTicksX;

            for (let i = 0; i <= numTicksX; i++) {
                const timeRel = tStart + i * stepX;
                const x = plotX + ((timeRel - tStart) / duration) * plotW;

                if (x < plotX || x > plotX + plotW) {
                    continue;
                }

                ctx.beginPath();
                ctx.moveTo(x, bottomY);
                ctx.lineTo(x, bottomY + 5);
                ctx.stroke();

                ctx.fillText(
                    this.formatTime(timeRel, tEnd),
                    x,
                    bottomY + 8 + (ctx.lineWidth - 1) / 2
                );
            }
        }

        if (yAxis.visible !== false) {
            const fontSize = this.applyStyle(ctx, yAxis);
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';

            // Y-axis line and frequency ticks.
            ctx.beginPath();
            ctx.moveTo(left, plotY);
            ctx.lineTo(left, bottomY);
            ctx.stroke();

            for (const freq of this.getFrequencyTicks(freqRange, plotH, fontSize)) {
                const y = plotY + ((fMax - freq) / (fMax - fMin)) * plotH;
                if (y < plotY - 1 || y > plotY + plotH + 1) {
                    continue;
                }

                ctx.beginPath();
                ctx.moveTo(left, y);
                ctx.lineTo(left - 5, y);
                ctx.stroke();

                ctx.fillText(this.formatFrequency(freq), left - 8 - (ctx.lineWidth - 1) / 2, y);
            }

            // The title shares the Y-axis label style.
            ctx.save();
            ctx.translate(Math.max(10, fontSize / 2 + 2), plotY + plotH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Frequency (Hz)', 0, 0);
            ctx.restore();
        }

        ctx.restore();
    }
}
