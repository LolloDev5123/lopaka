import {DrawContext} from '/src/draw/draw-context';
import {Font} from '/src/draw/fonts/font';
import {Point} from '/src/core/point';

export function useFontRender() {
    const renderFontToCanvas = (font: Font, text: string, scale: number = 1): HTMLCanvasElement | null => {
        if (!font) return null;

        // Simplify: GFX fonts are usually small (8-18pt).
        // 32px height is usually safe for the inline preview.
        // We will calc width properly though.
        const size = font.getSize(null as any, text, scale);
        
        // Ensure integer dimensions for canvas (crucial!)
        const width = Math.ceil(Math.max(size.x, 10));
        const height = 32; 

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.imageSmoothingEnabled = false;
        
        // Explicitly fill background to verify canvas presence
        // ctx.fillStyle = '#222222';
        // ctx.fillRect(0, 0, width, height);

        const dc = new DrawContext(canvas);
        dc.ctx.fillStyle = '#FFFFFF';

        // Draw text.
        // We will try to center it vertically roughly.
        // GFX drawing anchor is seemingly bottom-ish.
        // If we draw at (0, 20) in a 32px canvas, it should appear.
        // Let's rely on a safe baseline offset (e.g., 24px from top)
        const baselineY = 24;

        try {
            console.log(`[FontRender] Drawing ${font.name} at ${width}x${height}`);
            font.drawText(dc, text, new Point(0, baselineY), scale);
        } catch(e) {
            console.error('[FontRender] Error drawing text:', e);
            return null;
        }

        return canvas;
    };

    return {
        renderFontToCanvas
    };
}
