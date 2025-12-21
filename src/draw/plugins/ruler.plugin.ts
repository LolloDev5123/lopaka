import {DrawPlugin} from './draw.plugin';

export class RulerPlugin extends DrawPlugin {
    public update(ctx: CanvasRenderingContext2D): void {
        const {scale, display, pixelSize} = this.session.state;
        const {interfaceColors} = this.session.getPlatformFeatures();
        ctx.save();
        ctx.translate(0.5, 0.5);
        ctx.beginPath();
        for (let i = 0; i < display.x; i += 2) {
            ctx.moveTo(i * scale.x * pixelSize.x, -8);
            ctx.lineTo(i * scale.x * pixelSize.x, i % 10 === 0 ? -2 : -5);
        }
        for (let i = 0; i < display.y; i += 2) {
            ctx.moveTo(-8, i * scale.y * pixelSize.y);
            ctx.lineTo(i % 10 === 0 ? -2 : -5, i * scale.y * pixelSize.y);
        }
        ctx.strokeStyle = interfaceColors.rulerColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }
}
