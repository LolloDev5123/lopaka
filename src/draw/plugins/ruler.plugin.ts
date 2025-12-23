import {DrawPlugin} from './draw.plugin';

export class RulerPlugin extends DrawPlugin {
    public update(ctx: CanvasRenderingContext2D): void {
        const {scale, display, pixelSize, displaySettings} = this.session.state;
        const {interfaceColors} = this.session.getPlatformFeatures();
        const padding = displaySettings.padding;
        
        ctx.save();
        ctx.translate(0.5, 0.5);
        ctx.beginPath();
        
        // Ruler sits flush outside padding and measures total area (padding + screen + padding)
        const rulerWidth = 8;
        const gap = 1; // minimal gap
        const rulerEnd = -padding - gap;
        const rulerStart = rulerEnd - rulerWidth;
        
        // Calculate total measured area including padding on both sides
        const totalWidth = display.x * scale.x * pixelSize.x + padding * 2;
        const totalHeight = display.y * scale.y * pixelSize.y + padding * 2;
        
        
        // Draw ticks across the screen area only (not extending into padding)
        for (let i = 0; i <= display.x; i += 2) {
            ctx.moveTo(i * scale.x * pixelSize.x, rulerStart);
            ctx.lineTo(i * scale.x * pixelSize.x, i % 10 === 0 ? rulerEnd : rulerEnd - 3);
        }
        for (let i = 0; i <= display.y; i += 2) {
            ctx.moveTo(rulerStart, i * scale.y * pixelSize.y);
            ctx.lineTo(i % 10 === 0 ? rulerEnd : rulerEnd - 3, i * scale.y * pixelSize.y);
        }
        ctx.strokeStyle = interfaceColors.rulerColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }
}
