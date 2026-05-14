// Augments leaflet with the heatLayer API added by the leaflet.heat plugin.
// This file must be a module (hence the `export {}`) so that
// `declare module 'leaflet'` is treated as an augmentation, not an override.
export {};

declare module 'leaflet' {
    interface HeatLayerOptions {
        minOpacity?: number;
        maxZoom?: number;
        max?: number;
        radius?: number;
        blur?: number;
        gradient?: Record<number, string>;
    }

    interface HeatLayer extends Layer {
        setLatLngs(latlngs: Array<[number, number, number?]>): this;
        addLatLng(latlng: [number, number, number?]): this;
        setOptions(options: HeatLayerOptions): this;
        redraw(): this;
    }

    function heatLayer(
        latlngs: Array<[number, number, number?]>,
        options?: HeatLayerOptions
    ): HeatLayer;
}
