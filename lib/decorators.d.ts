export declare function mount(path: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function serve(path: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function use(target: any, propertyKey: string, descriptor: PropertyDescriptor): void;
export declare function guard(target: any, propertyKey: string, descriptor: PropertyDescriptor): void;
export declare function route(method: string, path?: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function get(path?: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function post(path?: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function put(path?: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function del(path?: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function options(path?: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function head(path?: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function patch(path?: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function trace(path?: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
//# sourceMappingURL=decorators.d.ts.map