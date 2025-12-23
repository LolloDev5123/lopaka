import {reactive, UnwrapRef, watch} from 'vue';
import {TPlatformFeatures} from 'src/platforms/platform';
import {getFont, loadFont} from '../draw/fonts';
import {VirtualScreen} from '../draw/virtual-screen';
import {Editor} from '../editor/editor';
import {U8g2Platform} from '../platforms/u8g2';
import {applyColor, generateUID, imageDataToImage, imageToImageData, loadImageDataAsync, logEvent} from '../utils';
import {ChangeHistory, TChange, THistoryEvent, useHistory} from './history';
import {AbstractLayer} from './layers/abstract.layer';
import {CircleLayer} from './layers/circle.layer';
import {EllipseLayer} from './layers/ellipse.layer';
import {IconLayer} from './layers/icon.layer';
import {LineLayer} from './layers/line.layer';
import {PaintLayer} from './layers/paint.layer';
import {GroupLayer} from './layers/group.layer';
import {RectangleLayer} from './layers/rectangle.layer';
import {TextLayer} from './layers/text.layer';
import platforms from './platforms';
import {Point} from './point';
import {paramsToState} from './decorators/mapping';
import {iconsList} from '../icons/icons';
import {Display} from '/src/core/displays';
import {FontFormat} from '/src/draw/fonts/font';
import {Project, ProjectScreen} from '../types';
import {TFTeSPIPlatform} from '../platforms/tft-espi';

const sessions = new Map<string, UnwrapRef<Session>>();
let currentSessionId = null;

type TSessionState = {
    platform: string;
    display: Point;
    isDisplayCustom: boolean;
    layers: AbstractLayer[];
    scale: Point;
    pixelSize: Point;
    lock: boolean;
    customImages: TLayerImageData[];
    isPublic: boolean;
    customFonts: TPlatformFont[];
    warnings: string[];
    screens: TSessionScreen[];
    activeScreenId: number;
    projectName: string;
};

export type TSessionScreen = {
    id: number;
    name: string;
    layers: AbstractLayer[];
    preview: string;
};

export class Session {
    LayerClassMap: {[key in ELayerType]: any} = {
        box: RectangleLayer,
        frame: RectangleLayer,
        rect: RectangleLayer,
        circle: CircleLayer,
        disc: CircleLayer,
        line: LineLayer,
        string: TextLayer,
        paint: PaintLayer,
        ellipse: EllipseLayer,
        // TODO: deprecated, use PaintLayer instead
        icon: IconLayer,
        group: GroupLayer,
    };

    id: string = generateUID();
    platforms = platforms;

    state: TSessionState = reactive({
        lock: false,
        platform: null,
        display: new Point(128, 64),
        isDisplayCustom: false,
        customDisplay: new Point(128, 64),
        layers: [],
        scale: new Point(4, 4),
        pixelSize: new Point(1, 1),
        customImages: [],
        icons: iconsList,
        isPublic: false,
        customFonts: [],
        warnings: [],
        screens: [{
            id: 1,
            name: 'Screen 1',
            layers: [],
            preview: ''
        }],
        activeScreenId: 1,
        projectName: 'Untitled Project',
    });

    history: ChangeHistory = useHistory();

    editor: Editor = new Editor(this);

    virtualScreen: VirtualScreen = new VirtualScreen(this, {
        ruler: true,
        smartRuler: true,
        highlight: true,
        pointer: false,
    });
    removeLayer = (layer: AbstractLayer, saveHistory: boolean = true) => {
        // Helper to remove from any level
        const removeFromLayers = (layers: AbstractLayer[]): boolean => {
            const index = layers.findIndex(l => l.uid === layer.uid);
            if (index > -1) {
                layers.splice(index, 1);
                return true;
            }
            // Check in groups
            for (const l of layers) {
                if (l instanceof GroupLayer) {
                    if (removeFromLayers(l.children)) {
                        return true;
                    }
                }
            }
            return false;
        };
        
        removeFromLayers(this.state.layers);
        
        if (saveHistory) {
            this.history.push({
                type: 'remove',
                layer,
                state: layer.state,
            });
            this.history.pushRedo({
                type: 'remove',
                layer,
                state: layer.state,
            });
        }
        this.virtualScreen.redraw();
    };
    mergeLayers = (layers: AbstractLayer[]) => {
        const layer = new PaintLayer(this.getPlatformFeatures());
        this.addLayer(layer, false);
        const ctx = layer.getBuffer().getContext('2d');
        layers.forEach((l) => {
            l.selected = false;
            if (l.inverted) {
                ctx.globalCompositeOperation = 'xor';
            }
            ctx.drawImage(l.getBuffer(), 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            this.removeLayer(l, false);
        });
        this.history.push({
            type: 'merge',
            layer,
            state: layers,
        });
        this.history.pushRedo({
            type: 'merge',
            layer,
            state: layers,
        });
        layer.recalculate();
        layer.applyColor();
        layer.stopEdit();
        layer.selected = true;
        layer.draw();
        this.virtualScreen.redraw();
        layer.selected = true;
        layer.draw();
        this.virtualScreen.redraw();
    };

    groupLayers = (layers: AbstractLayer[]) => {
        if (layers.length < 1) return;
        
        const group = new GroupLayer(this.getPlatformFeatures());
        group.name = 'Group ' + (this.state.layers.filter(l => l instanceof GroupLayer).length + 1);
        
        // Calculate group bounds from children?
        // For now, let's just move layers into group.
        // And remove them from main list.
        
        // We need to keep relative order?
        const sorted = layers.slice().sort((a, b) => a.index - b.index);
        
        // Clear selection state from layers before adding to group
        sorted.forEach(l => l.selected = false);
        
        group.layers = sorted;
        
        // Remove from session layers
        this.state.layers = this.state.layers.filter(l => !layers.includes(l));
        
        // Add group
        this.addLayer(group);
        
        // Select group
        this.selectLayer(group);
    };

    ungroupLayers = (group: GroupLayer) => {
        if (!(group instanceof GroupLayer)) return;
        
        // Get children from group
        const children = group.children.slice();
        
        // Remove group from layers
        this.state.layers = this.state.layers.filter(l => l.uid !== group.uid);
        
        // Add children back to main layer list
        children.forEach(child => {
            this.addLayer(child, false);
        });
        
        // Select all ungrouped children
        this.clearSelection();
        children.forEach(child => {
            child.selected = true;
        });
        
        this.virtualScreen.redraw();
    };

    lockLayer = (layer: AbstractLayer, saveHistory: boolean = true) => {
        layer.locked = true;
        if (saveHistory) {
            this.history.push({
                type: 'lock',
                layer,
                state: layer.state,
            });
            this.history.pushRedo({
                type: 'lock',
                layer,
                state: layer.state,
            });
        }
        this.virtualScreen.redraw();
    };
    
    // Screens
    
    public addScreen(name: string = 'New Screen') {
        const id = this.state.screens.length + 1;
        this.state.screens.push({
            id,
            name,
            layers: [],
            preview: ''
        });
        this.setActiveScreen(id);
    }
    
    public setActiveScreen(id: number) {
        // save current layers to active screen
        const currentScreen = this.state.screens.find(s => s.id === this.state.activeScreenId);
        if (currentScreen) {
            currentScreen.layers = this.state.layers;
            this.updateScreenPreview(currentScreen);
        }
        
        // load new screen
        const nextScreen = this.state.screens.find(s => s.id === id);
        if (nextScreen) {
            this.state.activeScreenId = nextScreen.id;
            this.state.layers = nextScreen.layers;
            requestAnimationFrame(() => {
                this.virtualScreen.redraw();
            });
        }
    }
    
    private previewCanvas: OffscreenCanvas = null;
    private previewTimeout: any = null;

    public updateScreenPreview(screen: TSessionScreen) {
        if (this.previewTimeout) clearTimeout(this.previewTimeout);
        this.previewTimeout = setTimeout(() => {
            // Use pixelSize to create canvas with correct aspect ratio
            const width = this.state.display.x * this.state.pixelSize.x;
            const height = this.state.display.y * this.state.pixelSize.y;
            
            if (!this.previewCanvas || this.previewCanvas.width !== width || this.previewCanvas.height !== height) {
                this.previewCanvas = new OffscreenCanvas(width, height);
            }
            const canvas = this.previewCanvas;
            
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            screen.layers.slice().sort((a, b) => a.index - b.index).forEach(layer => {
                if (layer.visible) {
                     // Scale the layer drawing by pixelSize
                     ctx.save();
                     ctx.scale(this.state.pixelSize.x, this.state.pixelSize.y);
                     ctx.drawImage(layer.getBuffer(), 0, 0);
                     ctx.restore();
                }
            });
            
            canvas.convertToBlob().then(blob => {
                 const reader = new FileReader();
                 reader.onload = () => {
                     screen.preview = reader.result as string;
                 };
                 reader.readAsDataURL(blob);
            });
        }, 500); // 500ms debounce
    }
    
    unlockLayer = (layer: AbstractLayer, saveHistory: boolean = true) => {
        layer.locked = false;
        if (saveHistory) {
            this.history.push({
                type: 'unlock',
                layer,
                state: layer.state,
            });
            this.history.pushRedo({
                type: 'unlock',
                layer,
                state: layer.state,
            });
        }
    };
    grab = (position: Point, size: Point) => {
        const layer = new PaintLayer(this.getPlatformFeatures());
        this.addLayer(layer);
        const ctx = layer.getBuffer().getContext('2d');
        ctx.drawImage(this.virtualScreen.canvas, position.x, position.y, size.x, size.y, 0, 0, size.x, size.y);
        layer.recalculate();
        layer.position = position.clone();
        layer.applyColor();
        layer.stopEdit();
        layer.selected = true;
        layer.draw();
        this.virtualScreen.redraw(false);
        return layer;
    };
    addLayer = (layer: AbstractLayer, saveHistory: boolean = true) => {
        const {display, scale, layers} = this.state;
        layer.resize(display, scale);
        layer.index = layer.index ?? layers.length + 1;
        layer.name = layer.name ?? 'Layer ' + (layers.length + 1);
        
        // Only add to group if:
        // 1. Exactly one layer is selected
        // 2. That layer is a GroupLayer
        // 3. The group is expanded (user can see it's a target for new layers)
        const selectedLayers = this.getSelectedLayers();
        const shouldAddToGroup = selectedLayers.length === 1 && 
                                selectedLayers[0] instanceof GroupLayer &&
                                (selectedLayers[0] as GroupLayer).expanded;
        
        if (shouldAddToGroup) {
            const selectedGroup = selectedLayers[0] as GroupLayer;
            selectedGroup.children.unshift(layer);
        } else {
            layers.unshift(layer);
        }
        
        if (saveHistory) {
            this.history.push({
                type: 'add',
                layer,
                state: layer.state,
            });
            this.history.pushRedo({
                type: 'add',
                layer,
                state: layer.state,
            });
        }
        layer.draw();
    };
    clearLayers = () => {
        this.state.layers = [];
        this.history.push({
            type: 'clear',
            layer: null,
            state: [],
        });
        this.history.pushRedo({
            type: 'clear',
            layer: null,
            state: [],
        });
        this.virtualScreen.redraw();
    };
    setDisplay = (display: Point, isLogged?: boolean) => {
        this.state.display = display;
        this.virtualScreen.resize();
        requestAnimationFrame(() => {
            this.virtualScreen.redraw();
        });
        // TODO: update cloud and storage to avoid display conversion
        const displayString = `${display.x}×${display.y}`;
        localStorage.setItem('lopaka_display', displayString);
        isLogged && logEvent('select_display', displayString);
    };
    setDisplayCustom = (enabled: boolean) => {
        this.state.isDisplayCustom = enabled;
    };
    saveDisplayCustom = (enabled: boolean) => {
        this.setDisplayCustom(enabled);
        localStorage.setItem('lopaka_display_custom', enabled ? 'true' : 'false');
    };
    setScale = (scale, isLogged?: boolean) => {
        this.state.scale = new Point(scale / 100, scale / 100);
        localStorage.setItem('lopaka_scale', `${scale}`);
        isLogged && logEvent('select_scale', scale);
    };
    setPixelSize = (pixelSize: Point, isLogged?: boolean) => {
        this.state.pixelSize = pixelSize;
        localStorage.setItem('lopaka_pixel_size', JSON.stringify(pixelSize.pack()));
        isLogged && logEvent('select_pixel_size', pixelSize.toString());
    };
    preparePlatform = async (name: string, isLogged?: boolean, layers?): Promise<void> => {
        const fonts = this.platforms[name].getFonts();
        this.lock();
        this.editor.clear();
        this.history.clear(false);
        let layersToload = layers ?? JSON.parse(localStorage.getItem(`${name}_lopaka_layers`));
        this.editor.font = getFont(fonts[0].name);
        this.unlock();
        await loadLayers(layersToload ?? []);
        if (!layers) {
            localStorage.setItem('lopaka_library', name);
            isLogged && logEvent('select_library', name);
        }
        this.virtualScreen.redraw(false);
    };

    loadFontsForLayers = (usedFonts: string[]) => {
        const fonts = [...this.platforms[this.state.platform].getFonts(), ...this.state.customFonts];
        if (!usedFonts.includes(fonts[0].name)) {
            usedFonts.push(fonts[0].name);
        }
        const fontLoadPromises = fonts.filter((font) => usedFonts.includes(font.name)).map((font) => loadFont(font));
        return Promise.all(fontLoadPromises);
    };

    setIsPublic = (enabled: boolean) => {
        this.state.isPublic = enabled;
    };

    /**
     * Clear current selection
     */
    public    clearSelection() {
        this.getAllLayers().forEach((l) => (l.selected = false));
    }

    /**
     * Add layer to selection or toggle it
     * @param layer 
     * @param multi if true, toggle, else set as single active
     */
    public selectLayer(layer: AbstractLayer, multi: boolean = false) {
        if (!multi) {
            this.clearSelection();
            layer.selected = true;
        } else {
             layer.selected = !layer.selected;
        }
        this.editor.selectionUpdate();
        this.virtualScreen.redraw();
    }
    
    public getSelectedLayers(): AbstractLayer[] {
        return this.getAllLayers().filter(l => l.selected);
    }
    
    /**
     * Get all layers including those nested in groups (recursively)
     */
    getAllLayers(): AbstractLayer[] {
        const result: AbstractLayer[] = [];
        
        const collectLayers = (layers: AbstractLayer[]) => {
            for (const layer of layers) {
                result.push(layer);
                if (layer instanceof GroupLayer) {
                    collectLayers(layer.children);
                }
            }
        };
        
        collectLayers(this.state.layers);
        return result;
    }
    
    /**
     * Find a layer by UID anywhere in the hierarchy
     */
    findLayerByUid(uid: string): AbstractLayer | null {
        const findInLayers = (layers: AbstractLayer[]): AbstractLayer | null => {
            for (const layer of layers) {
                if (layer.uid === uid) return layer;
                if (layer instanceof GroupLayer) {
                    const found = findInLayers(layer.children);
                    if (found) return found;
                }
            }
            return null;
        };
        
        return findInLayers(this.state.layers);
    }
    
    /**
     * Export entire project to .lpk format (JSON)
     */
    exportProject = () => {
        // Save current screen layers before export
        const currentScreen = this.state.screens.find(s => s.id === this.state.activeScreenId);
        if (currentScreen) {
            currentScreen.layers = this.state.layers;
        }
        
        const LPK_VERSION = '1.0';
        const projectData = {
            version: LPK_VERSION,
            metadata: {
                projectName: this.state.projectName,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                appVersion: 'lopaka-1.0'
            },
            session: {
                platform: this.state.platform,
                display: {x: this.state.display.x, y: this.state.display.y},
                isDisplayCustom: this.state.isDisplayCustom,
                pixelSize: {x: this.state.pixelSize.x, y: this.state.pixelSize.y},
                scale: {x: this.state.scale.x, y: this.state.scale.y},
                screens: this.state.screens.map(screen => ({
                    id: screen.id,
                    name: screen.name,
                    layers: screen.layers.map(layer => layer.state),
                    preview: screen.preview
                })),
                activeScreenId: this.state.activeScreenId,
                customImages: this.state.customImages,
                customFonts: this.state.customFonts
            }
        };
        return JSON.stringify(projectData, null, 2);
    };
    
    /**
     * Import project from .lpk format (JSON)
     */
    importProject = (jsonData: string) => {
        try {
            const projectData = JSON.parse(jsonData);
            if (!projectData.version || projectData.version !== '1.0') {
                throw new Error('Unsupported project version');
            }
            const sessionData = projectData.session;
            this.state.platform = sessionData.platform;
            this.state.display = new Point(sessionData.display.x, sessionData.display.y);
            this.state.isDisplayCustom = sessionData.isDisplayCustom || false;
            this.state.pixelSize = new Point(sessionData.pixelSize.x, sessionData.pixelSize.y);
            this.state.scale = new Point(sessionData.scale.x, sessionData.scale.y);
            this.state.customImages = sessionData.customImages || [];
            this.state.customFonts = sessionData.customFonts || [];
            this.state.screens = sessionData.screens.map(screenData => {
                const layers = screenData.layers.map(layerState => {
                    const LayerClass = this.LayerClassMap[layerState.t];
                    if (!LayerClass) return null;
                    const layer = new LayerClass(this.getPlatformFeatures());
                    layer.state = layerState;
                    return layer;
                }).filter(l => l !== null);
                return {id: screenData.id, name: screenData.name, layers, preview: screenData.preview || ''};
            });
            this.setActiveScreen(sessionData.activeScreenId || this.state.screens[0]?.id || 1);
            return true;
        } catch (error) {
            console.error('Failed to import project:', error);
            return false;
        }
    };

    generateCode = (): TSourceCode => {
        const {platform, layers} = this.state;
        const code = this.platforms[platform].generateSourceCode(
            layers.filter((layer) => !layer.modifiers.overlay || !layer.modifiers.overlay.getValue()),
            this.virtualScreen.ctx
        );
        return this.platforms[platform].sourceMapParser.parse(code);
    };

    importCode = async (code: string, append: boolean = false) => {
        const {platform} = this.state;
        const {states, warnings} = this.platforms[platform].importSourceCode(code);
        const fonts = [...this.platforms[platform].getFonts(), ...this.state.customFonts];
        for (const state of states) {
            if (state.type == 'string' && state.font !== '') {
                if (!fonts.find((font) => font.name == state.font)) {
                    warnings.push(`Font ${state.font} was not found. Resetting to default.`);
                    state.font = fonts[0].name;
                }
            }
            if (state.type == 'icon' && state.iconSrc) {
                await loadImageDataAsync(state.iconSrc).then((imgData) => {
                    state.data = imgData;
                    state.size = new Point(imgData.width, imgData.height);
                });
                delete state.iconSrc;
            }
        }

        if (states.length > 0)
            await loadLayers(
                states.map((state) => paramsToState(state, this.LayerClassMap)),
                append,
                true
            );
        this.state.warnings = warnings;
    };

    getPlatformFeatures = (platform?): TPlatformFeatures => {
        return this.platforms[platform ?? this.state.platform]?.features;
    };
    getDisplays = (platform?): Display[] => {
        return this.platforms[platform ?? this.state.platform]?.displays;
    };
    lock = () => {
        this.state.lock = true;
    };
    unlock = () => {
        this.state.lock = false;
    };
    initSandbox = () => {
        const platformLocal = localStorage.getItem('lopaka_library') ?? TFTeSPIPlatform.id;
        this.state.platform = platformLocal;
        this.preparePlatform(platformLocal ?? U8g2Platform.id);
        this.setDisplayCustom(localStorage.getItem('lopaka_display_custom') === 'true');
        const displayStored = localStorage.getItem('lopaka_display');
        if (displayStored) {
            const displayStoredArr = displayStored.split('×').map((n) => parseInt(n));
            this.setDisplay(new Point(displayStoredArr[0], displayStoredArr[1]));
        }
    };
    constructor() {
        this.history.subscribe((event: THistoryEvent, change: TChange) => {
            switch (event.type) {
                case 'undo':
                    switch (change.type) {
                        case 'add':
                            this.removeLayer(change.layer, false);
                            break;
                        case 'remove':
                            this.addLayer(change.layer, false);
                            break;
                        case 'change':
                            change.layer.state = change.state;
                            change.layer.draw();
                            break;
                        case 'merge':
                            this.removeLayer(change.layer, false);
                            change.state.forEach((l) => {
                                this.addLayer(l, false);
                            });
                            break;
                        case 'lock':
                            this.unlockLayer(change.layer, false);
                            break;
                        case 'unlock':
                            this.lockLayer(change.layer, false);
                            break;
                        case 'clear':
                            change.state.forEach((l) => {
                                const type: ELayerType = l.t;
                                if (type in this.LayerClassMap) {
                                    const layer = new this.LayerClassMap[type](this.getPlatformFeatures());
                                    layer.loadState(l);
                                    this.addLayer(layer, false);
                                    layer.saveState();
                                }
                            });
                            break;
                    }
                    this.virtualScreen.redraw();
                    break;
                case 'redo':
                    switch (change.type) {
                        case 'add':
                            this.addLayer(change.layer, false);
                            break;
                        case 'remove':
                            this.removeLayer(change.layer, false);
                            break;
                        case 'change':
                            change.layer.state = change.state;
                            change.layer.draw();
                            break;
                        case 'merge':
                            change.state.forEach((l) => {
                                this.removeLayer(l, false);
                            });
                            this.addLayer(change.layer, false);
                            break;
                        case 'lock':
                            this.lockLayer(change.layer, false);
                            break;
                        case 'unlock':
                            this.unlockLayer(change.layer, false);
                            break;
                        case 'clear':
                            this.state.layers = [];
                            break;
                    }
                    this.virtualScreen.redraw();
                    break;
            }
        });

        // Sync layers to active screen
        watch(
            () => this.state.layers,
            (newLayers) => {
                const active = this.state.screens.find((s) => s.id === this.state.activeScreenId);
                if (active) {
                    active.layers = newLayers;
                    this.updateScreenPreview(active);
                }
            }
        );
    }
}

export async function loadLayers(states: any[], append: boolean = false, saveHistory: boolean = false) {
    const session = useSession();
    if (!append) {
        session.state.layers = [];
    }
    const usedFonts = states.filter((s) => s.t == 'string').map((s) => s.f);
    return session.loadFontsForLayers(usedFonts).then(() => {
        states.forEach((state) => {
            const layerClass = session.LayerClassMap[state.t];
            const layer = new layerClass(session.getPlatformFeatures());
            layer.state = state;
            session.addLayer(layer, saveHistory);
        });
        session.virtualScreen.redraw();
    });
}

export function saveLayers(screen_id) {
    const session = useSession();
    const packedSession = session.state.layers.map((l) => l.state);
    localStorage.setItem(`${session.state.platform}_lopaka_layers`, JSON.stringify(packedSession));
}

export async function loadProject(project: Project, screen: ProjectScreen): Promise<ProjectScreen> {
    // TODO move project load to providers
    const session = useSession();
    session.unlock();
    session.state.platform = project.platform;
    if (screen) {
        await session.preparePlatform(project.platform, false, screen.layers);
        session.setDisplay(new Point(project.screen_x, project.screen_y));
        return screen;
    }
}

export async function addCustomFont(asset) {
    const session = useSession();
    const {customFonts} = session.state;

    const fileName = asset.filename.substring(0, asset.filename.lastIndexOf('.')) || asset.filename;
    const fileExtension = asset.filename.substring(asset.filename.lastIndexOf('.')).toLowerCase();

    let format;
    switch (fileExtension) {
        case '.bdf':
            format = FontFormat.FORMAT_BDF;
            break;
        default:
            format = FontFormat.FORMAT_GFX;
    }

    customFonts.push({
        name: fileName,
        title: fileName.split('#').pop(),
        file: asset.url,
        format: format,
    });
}

export async function addCustomImage(
    name: string,
    width: number,
    height: number,
    image: HTMLImageElement,
    process?: boolean,
    asset_id?: number
) {
    const session = useSession();
    const {customImages} = session.state;

    // check for duplicate names
    const nameRegex = new RegExp(`^${name}(_\\d+)?$`);
    const founded = customImages.filter((item) => nameRegex.test(item.name));
    if (founded.length > 0) {
        const last = founded[founded.length - 1];
        const lastNumber = last.name.match(/_(\d+)$/);
        const number = lastNumber ? parseInt(lastNumber[1]) + 1 : 1;
        name = `${name}_${number}`;
    }

    // convert to monochrome
    if (process) {
        const imageData = imageToImageData(image);
        const coloredImageData = applyColor(imageData, '#FFFFFF');
        image = await imageDataToImage(coloredImageData);
    }
    customImages.push({name, width, height, image, isCustom: true, id: asset_id});
}

export function useSession(id?: string) {
    if (currentSessionId) {
        return sessions.get(currentSessionId);
    }
    const session = new Session();
    const scaleLocal = JSON.parse(localStorage.getItem('lopaka_scale') ?? '300');
    session.setScale(scaleLocal);
    const pixelSizeLocal = JSON.parse(localStorage.getItem('lopaka_pixel_size') ?? '[1,1]');
    session.setPixelSize(Point.unpack(pixelSizeLocal));
    sessions.set(session.id, session);
    currentSessionId = session.id;
    return session;
}
