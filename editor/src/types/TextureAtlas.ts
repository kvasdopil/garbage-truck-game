export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextureFrame {
  frame: Frame;
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  sourceSize: {
    w: number;
    h: number;
  };
}

export interface Meta {
  app: string;
  version: string;
  image: string;
  format: string;
  size: {
    w: number;
    h: number;
  };
  scale: number;
}

export interface TextureAtlas {
  frames: Record<string, TextureFrame>;
  meta: Meta;
}

export interface TextureFile {
  id: string;
  name: string;
  path?: string;
  atlas: TextureAtlas;
}
