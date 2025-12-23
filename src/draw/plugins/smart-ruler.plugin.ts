import {DrawPlugin} from './draw.plugin';

export class SmartRulerPlugin extends DrawPlugin {
    public update(ctx: CanvasRenderingContext2D): void {
        const {layers, scale, display, pixelSize, displaySettings} = this.session.state;
        const selected = layers.filter((layer) => layer.selected || layer.isEditing());
        const {interfaceColors} = this.session.getPlatformFeatures();
        const textColor = interfaceColors.rulerColor;
        const lineColor = interfaceColors.rulerLineColor;
        const pixelScale = scale.clone().multiply(pixelSize);
        const padding = displaySettings.padding;

        if (selected.length) {
            // show distance to left and top
            ctx.save();
            ctx.beginPath();
            ctx.font = '10px sans-serif';
            const maxPoint = display.clone().multiply(pixelScale).round();
            const bounds = selected.reduce((bounds, layer) => bounds.extends(layer.bounds), selected[0].bounds);
            const p1 = bounds.pos.clone().multiply(pixelScale).round().add(0.5, 0.5);
            const p2 = bounds.size.clone().multiply(pixelScale).add(p1).round().subtract(0.5, 0.5);
            
            // Position flush outside padding
            const gap = 1;
            const rulerX = -padding - gap - 3;
            const textX = -padding - gap - 8;
            
            // Adjust displayed coordinates to account for padding
            // (so position 0 is at padding edge, not canvas edge)
            const adjustedBounds = {
                x: bounds.x - padding / (scale.x * pixelSize.x),
                y: bounds.y - padding / (scale.y * pixelSize.y),
                w: bounds.w,
                h: bounds.h
            };

            // horizontal line p1
            ctx.moveTo(rulerX, p1.y);
            ctx.lineTo(maxPoint.x, p1.y);

            ctx.fillStyle = textColor;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.round(adjustedBounds.y)}`, textX, p1.y);
            // vertical line p1
            ctx.moveTo(p1.x, rulerX);
            ctx.lineTo(p1.x, maxPoint.y);
            ctx.textBaseline = 'bottom';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.round(adjustedBounds.x)}`, p1.x, textX);
            if (Math.abs(p1.distanceTo(p2)) > 10) {
                // horizontal line p2
                ctx.moveTo(rulerX, p2.y);
                ctx.lineTo(maxPoint.x, p2.y);
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'right';
                ctx.fillText(`${Math.round(adjustedBounds.h + adjustedBounds.y)}`, textX, p2.y);
                // vertical line p2
                ctx.moveTo(p2.x, rulerX);
                ctx.lineTo(p2.x, maxPoint.y);
                ctx.textBaseline = 'bottom';
                ctx.textAlign = 'center';
                ctx.fillText(`${Math.round(adjustedBounds.w + adjustedBounds.x)}`, p2.x, textX);
            }
            ctx.strokeStyle = lineColor;
            ctx.setLineDash([1, 4]);
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }
}
