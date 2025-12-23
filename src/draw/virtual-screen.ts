import {EffectScope, reactive, toRefs, watch} from 'vue';
import {Session} from '../core/session';
import {Point} from '../core/point';
import {DrawPlugin} from './plugins/draw.plugin';
import {RulerPlugin} from './plugins/ruler.plugin';
import {SmartRulerPlugin} from './plugins/smart-ruler.plugin';
import {HighlightPlugin} from './plugins/highlight.plugin';
import {PointerPlugin} from './plugins/pointer.plugin';
import {AbstractLayer} from '../core/layers/abstract.layer';
import {GroupLayer} from '../core/layers/group.layer';
import {ResizeIconsPlugin} from './plugins/resize-icons.plugin';
import {PaintHighlightPlugin} from './plugins/paint-highlight.plugin';

type VirtualScreenOptions = {
    ruler: boolean;
    smartRuler: boolean;
    highlight: boolean;
    pointer: boolean;
};

export class VirtualScreen {
    private screen: OffscreenCanvas = null;
    public ctx: OffscreenCanvasRenderingContext2D = null;

    private pluginLayer: HTMLCanvasElement = null;
    private pluginLayerContext: CanvasRenderingContext2D = null;
    public state;

    private scope: EffectScope;
    canvas: HTMLCanvasElement = null;
    canvasContext: CanvasRenderingContext2D = null;
    plugins: DrawPlugin[] = [];

    constructor(
        private session: Session,
        public options: VirtualScreenOptions
    ) {
        const {display, platform, scale} = toRefs(session.state);
        this.screen = new OffscreenCanvas(display.value.x, display.value.y);
        this.ctx = this.screen.getContext('2d', {
            willReadFrequently: true,
            alpha: true,
        });
        if (options.ruler) {
            this.plugins.push(new RulerPlugin(session));
        }
        if (options.smartRuler) {
            this.plugins.push(new SmartRulerPlugin(session));
        }
        if (options.highlight) {
            this.plugins.push(new HighlightPlugin(session));
        }
        if (options.pointer) {
            this.plugins.push(new PointerPlugin(session));
        }
        this.plugins.push(new ResizeIconsPlugin(session));
        this.plugins.push(new PaintHighlightPlugin(session));
        this.scope = new EffectScope();
        this.scope.run(() => {
            this.state = reactive({
                updates: 1,
            });
            watch([platform], () => {
                this.redraw(false);
            });
            watch([scale, display, session.state.pixelSize], () => {
                this.resize();
                this.redraw(false);
            });
        });
    }

    setCanvas(canvas: HTMLCanvasElement, isPlugins = true) {
        this.canvas = canvas;
        this.canvasContext = canvas.getContext('2d', {
            willReadFrequently: true,
            alpha: true,
        });
        if (this.plugins.length && isPlugins) {
            this.pluginLayer = document.createElement('canvas');
            this.pluginLayerContext = this.pluginLayer.getContext('2d', {
                willReadFrequently: true,
                alpha: true,
            });
            this.pluginLayerContext.imageSmoothingEnabled = true;
            this.canvas.parentElement.prepend(this.pluginLayer);
            Object.assign(this.pluginLayer.style, {
                pointerEvents: 'none',
                position: 'absolute',
                left: -DrawPlugin.offset.x + 'px',
                top: -DrawPlugin.offset.y + 'px',
                zIndex: 1,
            });
        }
        this.resize();
        this.redraw(false);
    }

    updateMousePosition(position: Point, event: MouseEvent | TouchEvent) {
        if (this.pluginLayer) {
            requestAnimationFrame(() => {
                const ctx = this.pluginLayerContext;
                ctx.clearRect(0, 0, this.pluginLayer.width, this.pluginLayer.height);
                this.plugins.forEach((plugin) => {
                    ctx.save();
                    ctx.scale(2, 2);
                    // Container has margin=padding, pluginLayer positioned at -offset
                    // So we just translate by offset to align (0,0) with screen top-left
                    ctx.translate(DrawPlugin.offset.x, DrawPlugin.offset.y);
                    plugin.update(ctx, position, event);
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.restore();
                });
            });
        }
    }

    getLayersInPoint(position: Point): AbstractLayer[] {
        const point = position.clone().divide(this.session.state.scale).divide(this.session.state.pixelSize).round();
        return this.session.state.layers.filter((layer) => layer.contains(point)).sort((a, b) => b.index - a.index);
    }

    public resize() {
        const {display, scale, layers, pixelSize, displaySettings} = this.session.state;
        const size = display.clone();
        this.screen.width = size.x;
        this.screen.height = size.y;
        
        // Visual size includes padding for the container size calculations if necessary,
        // but typically FuiCanvas handles container sizing via DOM.
        // However, pluginLayer is ABSOLUTE positioned and needs specific dimensions.
        // It needs to cover Screen + Padding + Offset.
        
        const padding = displaySettings.padding;
        const screenWidth = size.x * scale.x * pixelSize.x;
        const screenHeight = size.y * scale.y * pixelSize.y;

        if (this.canvas) {
            this.canvas.width = size.x;
            this.canvas.height = size.y;
            // Canvas styles are bound in FuiCanvas, but we can sync here if needed. 
            // Actually FuiCanvas binds width/height style, so we might not need to touch .style here?
            // The existing code does updates styles. Let's keep it consistent but FuiCanvas might override.
            Object.assign(this.canvas.style, {
                width: `${screenWidth}px`,
                height: `${screenHeight}px`,
            });
        }
        if (this.pluginLayer) {
            // pluginLayer needs to cover the screen plus padding plus offset
            // And it is positioned at -offset relative to container top-left.
            // Container top-left is 0,0. Screen starts at padding,padding.
            // So logical 0,0 is at padding,padding.
            // PluginLayer needs to cover from -Offset to ScreenEnd + Padding + Offset ??
            // Existing logic: width = (ScreenVal + Offset*2) * 2 (scale 2 for retina?).
            // We need to add Padding * 2 (left and right / top and bottom).
            
            const totalWidth = screenWidth + DrawPlugin.offset.x * 2 + padding * 2;
            const totalHeight = screenHeight + DrawPlugin.offset.y * 2 + padding * 2;
            
            this.pluginLayer.width = totalWidth * 2;
            this.pluginLayer.height = totalHeight * 2;
            Object.assign(this.pluginLayer.style, {
                width: `${totalWidth}px`,
                height: `${totalHeight}px`,
                // Now that container has margin (padding), we can position relative to it
                // The margin creates space, and we position at -offset to reach into that space
                left: `-${DrawPlugin.offset.x}px`,
                top: `-${DrawPlugin.offset.y}px`,
            });
        }
        layers.forEach((layer: AbstractLayer) => {
            layer.resize(display, scale);
            layer.draw();
        });
    }

    public redraw(update = true) {
        if (!this.canvas) return;
        this.clear();
        const overlays = [];
        // Recursively collect all visible layers, respecting group visibility hierarchy
        const collectVisibleLayers = (layers: AbstractLayer[], parentVisible: boolean = true): AbstractLayer[] => {
            const result: AbstractLayer[] = [];
            for (const layer of layers) {
                // Check if this layer inherits visibility from parent
                const isVisible = parentVisible && layer.visible;
                
                if (layer instanceof GroupLayer) {
                    // Don't draw groups themselves, but collect their children
                    // Pass group's visibility down to children
                    if (layer.children) {
                        result.push(...collectVisibleLayers(layer.children, isVisible));
                    }
                } else {
                    // Only add non-group layers that are visible
                    if (isVisible) {
                        result.push(layer);
                    }
                }
            }
            return result;
        };
        
        const allLayers = collectVisibleLayers(this.session.state.layers).sort((a, b) => a.index - b.index);
        
        allLayers.forEach((layer) => {
                // skip all oberlays
                if (layer.modifiers.overlay && layer.modifiers.overlay.getValue()) {
                    overlays.push(layer);
                    return;
                }
                if (layer.inverted) {
                    this.ctx.globalCompositeOperation = 'difference';
                }
                this.ctx.drawImage(layer.getBuffer(), 0, 0);
                this.ctx.globalCompositeOperation = 'source-over';
            });
        if (update) {
            this.state.updates++;
        }
        // Create data without alpha channel and apply foreground color
        const { displaySettings } = this.session.state;
        // Parse hex color to RGB
        const hex = displaySettings.foregroundColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        const data = this.ctx.getImageData(0, 0, this.screen.width, this.screen.height).data;
        const newData = new Uint8ClampedArray(data.length);
        
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha >= 255 / 2) {
                newData[i] = r;
                newData[i + 1] = g;
                newData[i + 2] = b;
                newData[i + 3] = 255;
            } else {
                newData[i + 3] = 0;
            }
        }

        this.canvasContext.putImageData(
            new ImageData(newData, this.screen.width, this.screen.height),
            0,
            0
        );
        // draw overlays
        this.canvasContext.globalAlpha = 0.3;
        overlays.forEach((layer) => {
            this.canvasContext.drawImage(layer.getBuffer(), 0, 0);
        });
        this.canvasContext.globalAlpha = 1;
        if (this.pluginLayer) {
            requestAnimationFrame(() => {
                const ctx = this.pluginLayerContext;
                ctx.clearRect(0, 0, this.pluginLayer.width, this.pluginLayer.height);
                this.plugins.forEach((plugin) => {
                    ctx.save();
                    ctx.scale(2, 2);
                    const padding = this.session.state.displaySettings.padding;
                    ctx.translate(DrawPlugin.offset.x + padding, DrawPlugin.offset.y + padding);
                    plugin.update(ctx, null, null);
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.restore();
                });
            });
        }
    }

    public grab(position: Point, size: Point): ImageData {
        const data = this.canvasContext.getImageData(position.x, position.y, size.x, size.y);
        return data;
    }

    public clear() {
        if (!this.canvas) return;
        this.ctx.clearRect(0, 0, this.screen.width, this.screen.height);
        this.canvas.getContext('2d').clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public onDestory() {
        this.scope.stop();
    }
}
