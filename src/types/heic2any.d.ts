declare module "heic2any" {
  type HeicConversionOptions = {
    blob: Blob;
    toType?: string;
    quality?: number;
    gifInterval?: number;
    multiple?: true;
  };

  function heic2any(options: HeicConversionOptions): Promise<Blob | Blob[]>;

  export default heic2any;
}
