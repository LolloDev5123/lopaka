import {DrawContext} from '/src/draw/draw-context';
import {Font} from '/src/draw/fonts/font';
import {Point} from '/src/core/point';

export function useFontRender() {
    const renderFontToCanvas = (font: Font, text: string, inputScale: number = 1): HTMLCanvasElement | null => {
        if (!font) return null;

        // Sanitize text: replace missing characters with [?]
        let safeText = '';
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            if (font.hasChar(code)) {
                safeText += text[i];
            } else {
                safeText += '[?]';
            }
        }

        // 1. Get raw size at scale 1 to determine height
        const rawSize = font.getSize(null as any, safeText, 1);
        if (rawSize.y <= 0) return null;

        const TARGET_HEIGHT = 20; // Target height for the font content
        const MIN_SCALE = 1;
        
        // Calculate scale to normalize height (upscale small fonts, keep big ones reasonably sized)
        let scale = TARGET_HEIGHT / rawSize.y;
        if (scale < MIN_SCALE) scale = MIN_SCALE; // Don't downscale already readable fonts too much
        
        // Re-calculate size with the normalized scale
        const size = font.getSize(null as any, safeText, scale);
        
        // Ensure integer dimensions for clean canvas
        const width = Math.ceil(Math.max(size.x, 10));
        const height = 32; // Fixed container height for UI consistency

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.imageSmoothingEnabled = false;

        const dc = new DrawContext(canvas);
        dc.ctx.fillStyle = '#FFFFFF';

        // Center vertically based on the calculated height
        const DrawY = Math.floor((height + size.y) / 2) - 2; // -2 for slight visual optical balancing

        try {
            font.drawText(dc, safeText, new Point(0, DrawY), scale);
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
