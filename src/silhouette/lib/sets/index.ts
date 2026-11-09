// sets — architecture and recurring locations for the TERMS silhouette cut (DESIGN-silhouette §2, §4). API: ./INDEX.md
export * from './shared';
export {LaserLines} from './LaserLines';
export type {LaserLinesProps, LaserSegment} from './LaserLines';
export {cellMaterial, makeCellUniforms, setCellUniforms} from './cellLight';
export type {CellMode, CellUniforms, CellLightState} from './cellLight';
export * from './cell';
export {CellRoom} from './CellRoom';
export type {CellRoomProps} from './CellRoom';
export {Megablock, CityGrid, megablockLayout, megablockPane, MEGABLOCK_WARM_DEFAULT, cityGridLayout} from './Megablock';
export type {MegablockProps, MegaFace, WarmWindow, CityGridProps, CityBlock} from './Megablock';
export {Plaza, plazaSpots, PLAZA_SPOTS, PLAZA_CAMERAS} from './Plaza';
export type {PlazaProps} from './Plaza';
export {HouseCube, houseSpots, HOUSE_SPOTS, HOUSE_CAMERAS, HOUSE_MIN_SIZE} from './HouseCube';
export type {HouseCubeProps} from './HouseCube';
export {Corridor, corridorLayout, CORRIDOR_SPOTS, CORRIDOR_CAMERAS} from './Corridor';
export type {CorridorProps} from './Corridor';
