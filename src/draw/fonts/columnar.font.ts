import {Point} from '../../core/point';
import {DrawContext} from '../draw-context';
import parseColumnar, {ColumnarFontSpec} from './columnar-parser';
import {Font, FontFormat} from './font';

export class ColumnarFont extends Font {
    fontData: FontPack;

    constructor(
        protected source: TFontSource | ColumnarFontSpec,
        public name: string,
        protected options?: TFontSizes
    ) {
        super(source as TFontSource, name, FontFormat.FORMAT_GFX, options);
    }

    async loadFont(): Promise<void> {
        // If source is already a ColumnarFontSpec, parse it directly
        if (typeof this.source === 'object' && 'data' in this.source && Array.isArray(this.source.data)) {
            return Promise.resolve().then(() => {
                this.fontData = parseColumnar(this.source as ColumnarFontSpec);
            });
        }
        
        // Handle module imports (both eager and lazy)
        if (this.source instanceof Function) {
            // Lazy import - call the function to get the module
            return this.source().then((module: any) => {
                const spec = module.default || module;
                if (!spec || !spec.data) {
                    console.error('Invalid columnar font module:', module);
                    throw new Error(`ColumnarFont ${this.name}: module has no data`);
                }
                this.fontData = parseColumnar(spec);
            });
        }
        
        // Handle eager-loaded modules (object is already the module)
        if (typeof this.source === 'object' && 'default' in this.source) {
            return Promise.resolve().then(() => {
                const spec = (this.source as any).default || this.source;
                if (!spec || !spec.data) {
                    console.error('Invalid columnar font eager module:', this.source);
                    throw new Error(`ColumnarFont ${this.name}: eager module has no data`);
                }
                this.fontData = parseColumnar(spec);
            });
        }
        
        console.error('Unknown source type for ColumnarFont:', typeof this.source, this.source);
        throw new Error(`ColumnarFont ${this.name}: only supports direct specs or module imports`);
    }

    getSize(dc: DrawContext, text: string, scaleFactor: number = 1): Point {
        const {meta, glyphs} = this.fontData;
        const size = new Point(0, 0);
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            if (glyphs.has(charCode)) {
                const glyphData = glyphs.get(charCode);
                size.x += glyphData.xAdvance;
                const h = glyphData.bounds[3];
                if (h > size.y) {
                    size.y = h;
                }
            }
        }
        return size.multiply(scaleFactor, scaleFactor);
    }

    drawText(dc: DrawContext, text: string, position: Point, scaleFactor: number = 1): void {
        const {meta, glyphs} = this.fontData;
        const charPos = position.clone();
        dc.ctx.save();
        dc.ctx.beginPath();
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            if (glyphs.has(charCode)) {
                const glyphData = glyphs.get(charCode);
                const {bounds, bytes} = glyphData;
                const bytesPerRow = Math.ceil(bounds[2] / 8);
                for (let j = 0; j < bounds[3]; j++) {
                    for (let k = 0; k < bytesPerRow; k++) {
                        const byte = bytes[j * bytesPerRow + k];
                        for (let l = 0; l < 8; l++) {
                            if (byte & (1 << (7 - l))) {
                                dc.ctx.rect(
                                    charPos.x + (k * 8 + l + bounds[0]) * scaleFactor,
                                    charPos.y + (j - bounds[1]) * scaleFactor - scaleFactor,
                                    scaleFactor,
                                    scaleFactor
                                );
                            }
                        }
                    }
                }
                charPos.x += glyphData.xAdvance * scaleFactor;
            }
        }
        dc.ctx.fill();
        dc.ctx.restore();
    }
    
    hasChar(code: number): boolean {
        return this.fontData.glyphs.has(code);
    }
}
