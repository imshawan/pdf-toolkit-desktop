export interface QpdfModule {
  (opts: { locateFile: (path: string) => string }): Promise<QpdfInstance>;
}

export interface QpdfInstance {
  callMain: (args: string[]) => number;
  FS: EmscriptenFS;
  WORKERFS: any;
}

export interface EmscriptenFS {
  mkdir: (path: string) => void;
  mount: (
    type: QpdfInstance["WORKERFS"],
    opts: { blobs: { name: string; data: Blob }[] },
    mountPoint: string
  ) => void;
  unmount: (mountPoint: string) => void;
  writeFile: (path: string, data: Uint8Array) => void;
  readFile: (path: string) => Uint8Array;
}

declare const module: QpdfModule;
export default module;
