// Mock Konva for Jest tests
export class Stage {
  constructor() {}
  getPointerPosition() {
    return { x: 0, y: 0 };
  }
  x() { return 0; }
  y() { return 0; }
}

export namespace Konva {
  export interface KonvaEventObject<T> {
    evt: T;
    target: any;
  }
}

export default {
  Stage,
  Konva,
};
