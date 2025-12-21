import {TPlatformFeatures} from '../../platforms/platform';
import {AbstractLayer, EditMode, TLayerEditPoint} from './abstract.layer';
import {Point} from '../point';
import {Rect} from '../rect';
import {mapping} from '../decorators/mapping';
import {useSession} from '../session';

export class GroupLayer extends AbstractLayer {
    protected type: ELayerType = 'group';

    @mapping('ch', 'any', true) public children: AbstractLayer[] = [];
    @mapping('ex') public expanded: boolean = true;

    constructor(protected features?: TPlatformFeatures) {
        super(features);
        this.name = 'Group';
    }

    get layers() {
        return this.children;
    }

    set layers(layers: AbstractLayer[]) {
        this.children = layers;
    }

    protected onLoadState() {
        const session = useSession();
        // re-hydrate children if they are plain objects
        if (this.children && this.children.length > 0 && !(this.children[0] instanceof AbstractLayer)) {
             // @ts-ignore
             const childStates = this.children as any[];
             this.children = childStates.map(state => {
                 const layerClass = session.LayerClassMap[state.t];
                 if (layerClass) {
                     const layer = new layerClass(this.features);
                     layer.state = state;
                     return layer;
                 }
                 return null;
             }).filter(l => l !== null);
        }
    }

    startEdit(mode: EditMode, point?: Point, editPoint?: TLayerEditPoint) {
        this.mode = mode;
        if (mode === EditMode.CREATING) {
            this.bounds = new Rect(point.clone(), new Point(1, 1));
            this.updateBounds();
        }
    }

    edit(point: Point, originalEvent?: MouseEvent) {
        if (this.mode === EditMode.CREATING) {
            const newSize = point.clone().subtract(this.bounds.pos).abs();
            this.bounds = new Rect(this.bounds.pos.clone(), newSize);
            this.updateBounds();
        }
    }

    stopEdit() {
        this.mode = EditMode.NONE;
    }

    draw() {
        const {dc, buffer} = this;
        dc.clear();
        
        this.children.forEach(child => {
            if (child.visible) {
                 child.draw();
                 // draw child on group buffer
                 dc.ctx.drawImage(child.getBuffer(), 0, 0);
            }
        });
    }

    updateBounds(): void {
        // bounds update logic
        this.bounds = new Rect(this.bounds.pos.clone(), this.bounds.size.clone());
    }
    
    resize(display: Point, scale: Point): void {
        super.resize(display, scale);
        // We need to resize children too, so they update their buffers
        this.children.forEach(child => child.resize(display, scale));
        this.draw();
    }
}
