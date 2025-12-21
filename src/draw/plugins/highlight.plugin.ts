import {Point} from '../../core/point';
import {DrawPlugin} from './draw.plugin';

export class HighlightPlugin extends DrawPlugin {
    public update(ctx: CanvasRenderingContext2D, point: Point): void {
        if (this.session.editor.state.activeTool) return;
        const {scale, layers, pixelSize} = this.session.state;
        const {interfaceColors} = this.session.getPlatformFeatures();
        const pixelScale = scale.clone().multiply(pixelSize);
        ctx.save();
        ctx.beginPath();
        layers.forEach((layer) => {
            const bounds = layer.bounds.clone().multiply(pixelScale).round().add(-0.5, -0.5, 1, 1);
            if (layer.selected) {
                ctx.save();
                ctx.strokeStyle = interfaceColors.selectColor;
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
                ctx.restore();
            }
        });
        if (point) {
            const hovered = layers
                .filter((l) => l.contains(point.clone().divide(pixelScale).round()))
                .sort((a, b) => b.index - a.index);
            if (hovered.length) {
                const upperLayer = hovered[0];
                if (!upperLayer.selected) {
                    const bounds = upperLayer.bounds.clone().multiply(pixelScale).round().add(-0.5, -0.5, 1, 1);
                    ctx.save();
                    ctx.strokeStyle = interfaceColors.hoverColor;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
                    ctx.restore();
                }
            }
        }
        ctx.strokeStyle = interfaceColors.selectColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }
}
