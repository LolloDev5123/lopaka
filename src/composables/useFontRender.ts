import {DrawContext} from '/src/draw/draw-context';
import {Font} from '/src/draw/fonts/font';
import {Point} from '/src/core/point';

export function useFontRender() {
    const renderFontToCanvas = (font: Font, text: string, inputScale: number = 1): HTMLCanvasElement | null => {
        if (!font) return null;

        // Check if font can render at least half of the text
        let usableChars = 0;
        for (let i = 0; i < text.length; i++) {
            if (font.hasChar(text.charCodeAt(i))) usableChars++;
        }
        
        // If less than half the characters exist, generate text from available glyphs
        let safeText = text;
        if (usableChars < text.length / 2) {
            // Get first 10-15 available characters from the font
            safeText = '';
            const maxChars = 15;
            
            // Try common printable ASCII range first (32-126)
            for (let code = 32; code <= 126 && safeText.length < maxChars; code++) {
                if (font.hasChar(code)) {
                    safeText += String.fromCharCode(code);
                }
            }
            
            // If still empty, try extended range
            if (safeText.length === 0) {
                for (let code = 0; code < 256 && safeText.length < maxChars; code++) {
                    if (font.hasChar(code)) {
                        safeText += String.fromCharCode(code);
                    }
                }
            }
            
            if (safeText.length === 0) return null; // Font has no renderable characters
        } else {
            // Sanitize text: replace missing characters with [?]
            safeText = '';
            for (let i = 0; i < text.length; i++) {
                const code = text.charCodeAt(i);
                if (font.hasChar(code)) {
                    safeText += text[i];
                } else {
                    safeText += '[?]';
                }
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
