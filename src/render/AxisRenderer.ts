import { SpectrogramModel } from '../core/SpectrogramModel';

export class AxisRenderer {
    private model: SpectrogramModel;

    constructor(model: SpectrogramModel) {
        this.model = model;
    }

    draw(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        timeRange: [number, number],
        freqRange: [number, number],
        margins: { left: number; bottom: number; top: number; right: number }
    ) {
        // Save context state
        ctx.save();

        // Style settings
        ctx.strokeStyle = '#464646';
        ctx.fillStyle = '#252525';
        ctx.font = '11px monospace';
        ctx.textBaseline = 'top';
        ctx.lineWidth = 1;

        const [tStart, tEnd] = timeRange;
        const [fMin, fMax] = freqRange;
        const duration = tEnd - tStart;
        const { left, bottom, top, right } = margins;

        const plotX = left;
        const plotY = top;
        const plotW = width - left - right;
        const plotH = height - bottom - top;

        if (duration <= 0) {
            ctx.restore();
            return;
        }

        // Draw Axis Lines
        // X-Axis line (at bottom of plot)
        ctx.beginPath();
        const bottomY = plotY + plotH;
        ctx.moveTo(left, bottomY);
        ctx.lineTo(left + plotW, bottomY);
        ctx.stroke();

        // Y-Axis line (at left of plot)
        ctx.beginPath();
        ctx.moveTo(left, plotY);
        ctx.lineTo(left, bottomY);
        ctx.stroke();

        // Time Axis (X): draw 5-10 ticks
        const numTicksX = Math.max(3, Math.floor(plotW / 100));
        const stepX = duration / numTicksX;

        const startTimeStamp = this.model.startTime;

        for (let i = 0; i <= numTicksX; i++) {
            const timeRel = tStart + i * stepX;
            // Project relative to Plot Area
            const x = plotX + ((timeRel - tStart) / duration) * plotW;

            if (x < plotX || x > plotX + plotW) {
                continue;
            }

            // Draw Tick (extending down from axis line)
            ctx.beginPath();
            ctx.moveTo(x, bottomY);
            ctx.lineTo(x, bottomY + 5);
            ctx.stroke();

            // Draw Label
            const totalSeconds = startTimeStamp + timeRel * 1000;
            let label = '';
            if (this.model.showRealTimeScale) {
                const date = new Date(totalSeconds);
                const hh = date.getHours().toString().padStart(2, '0');
                const mm = date.getMinutes().toString().padStart(2, '0');
                const ss = date.getSeconds().toString().padStart(2, '0');
                label = `${hh}:${mm}:${ss}`;
            } else if (totalSeconds >= 0) {
                label = `${Math.floor(tEnd - totalSeconds / 1000)}s`;
            }

            // Adjust label position
            ctx.textAlign = 'center';
            ctx.fillText(label, x, bottomY + 8);
        }

        // Frequency Axis (Y): calculate nice steps (1, 2, 5, 10)
        const freqSpan = fMax - fMin;
        const targetTicksY = Math.max(3, Math.floor(plotH / 40));

        let niceStep = 1;

        if (freqSpan > 0 && targetTicksY > 0) {
            const rawStep = freqSpan / targetTicksY;
            const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
            const residual = rawStep / magnitude;

            if (residual > 5) {
                niceStep = 10 * magnitude;
            } else if (residual > 2) {
                niceStep = 5 * magnitude;
            } else if (residual > 1) {
                niceStep = 2 * magnitude;
            } else {
                niceStep = 1 * magnitude;
            }
        }

        // Align start/end to nice steps
        // We draw starting from fMax downwards, but aligned to grid
        const startTick = Math.floor(fMax / niceStep) * niceStep;
        const endTick = Math.floor(fMin / niceStep) * niceStep;

        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        // Prevent infinite loop if niceStep is 0 (shouldn't happen)
        const safeStep = niceStep || 1;

        for (let freq = startTick; freq >= endTick; freq -= safeStep) {
            // Handle epsilon to allow ticks exactly at boundaries
            const epsilon = safeStep / 1000;
            if (freq > fMax + epsilon) {
                continue;
            }
            if (freq < fMin - epsilon) {
                continue;
            }

            // Compute Y position
            // y = 0 at fMax (Top), y = plotH at fMin (Bottom)
            // normalizedY = (fMax - freq) / span
            const normalizedY = (fMax - freq) / freqSpan;
            const y = plotY + normalizedY * plotH;

            // Extra clip check just in case
            if (y < plotY - 1 || y > plotY + plotH + 1) {
                continue;
            }

            // Draw Tick
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(left - 5, y);
            ctx.stroke();

            // Draw Label
            // Use nice formatting for floats if needed, but request asked for 1,2,5 etc.
            // If magnitude < 1, might need decimals.
            // Default to string, maybe toFixed if fraction?
            let label = freq.toString();
            // If it has many decimals, trim
            if (freq % 1 !== 0) {
                label = freq.toFixed(1).replace(/\.0$/, '');
            }

            ctx.fillText(label, left - 8, y);
        }

        // Axis Title
        ctx.save();
        ctx.translate(10, plotH / 2.8);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'right';
        ctx.fillText('Frequency (Hz)', 0, 0);

        ctx.restore();
    }
}
