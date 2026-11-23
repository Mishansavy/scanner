export type Point = { 
    x: number; 
    y: number
};

export type Filter  = 'original' | 'gray' | 'bw';
export type Rotation = 0 | 90 | 180 | 270;

export type Page = {
    id: string;
    file: File;
    url: string;
    rotation: Rotation;
    filter: Filter;
    corners: Point[] | null; //TL, TR, BR, BL in original image pixels
}
