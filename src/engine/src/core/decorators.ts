import { Script, ScriptAttribute } from './Script';
import { Entity } from './Entity';

const registeredComponents = new Map<string, new (entity: Entity) => Script>();
const metadataClassMap = new WeakMap<any, new (entity: Entity) => Script>();

export function registerComponent(ComponentClass: new (entity: Entity) => Script): void {
    const name = ComponentClass.name;
    registeredComponents.set(name, ComponentClass);
    (ComponentClass as any).__registered = true;
    
    const prototype = (ComponentClass as any).prototype;
    if (prototype) {
        const metadata = (prototype as any)[(Symbol as any).metadata];
        if (metadata) {
            metadataClassMap.set(metadata, ComponentClass);
        }
    }
}

export function getRegisteredComponent(name: string): (new (entity: Entity) => Script) | undefined {
    return registeredComponents.get(name);
}

export function getAllRegisteredComponents(): Map<string, new (entity: Entity) => Script> {
    return new Map(registeredComponents);
}

export interface AttributeOptions {
    type?: 'number' | 'string' | 'boolean' | 'vector3' | 'color' | 'texture' | 'entity' | 'enum';
    title?: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    enum?: { [key: string]: any };
}

export function attribute(options: AttributeOptions = {}): any {
    return (value: any, context: any) => {
        let ComponentClass: any;
        let propertyKey: string | symbol;

        if (context && typeof context === 'object' && 'kind' in context) {
            propertyKey = context.name;
            
            if (context.kind === 'field') {
                const metadata = (context as any).metadata;
                if (metadata) {
                    ComponentClass = metadataClassMap.get(metadata);
                    if (!ComponentClass && metadata.__class) {
                        ComponentClass = metadata.__class;
                    }
                }
                
                if (!ComponentClass) {
                    const access = (context as any).access;
                    if (access && access.set) {
                        try {
                            const testObj: any = {};
                            access.set(testObj, undefined);
                            ComponentClass = testObj.constructor;
                            if (metadata && ComponentClass) {
                                metadata.__class = ComponentClass;
                                metadataClassMap.set(metadata, ComponentClass);
                            }
                        } catch (e) {
                        }
                    }
                }
                
                if (ComponentClass && context.addInitializer) {
                    const initialValue = value;
                    context.addInitializer(function(this: any) {
                        const attr = (ComponentClass as any).__attributes?.find((a: ScriptAttribute) => a.name === propertyKey);
                        if (attr && attr.default === undefined && initialValue !== undefined) {
                            attr.default = initialValue;
                        }
                    });
                }
            } else {
                ComponentClass = value && value.constructor;
            }
        } else {
            propertyKey = context as string | symbol;
            ComponentClass = value && value.constructor;
        }

        if (!ComponentClass) {
            return value;
        }

        if (!ComponentClass.__attributes) {
            ComponentClass.__attributes = [];
        }

        const attr: ScriptAttribute = {
            name: propertyKey as string,
            type: options.type || 'number',
            default: value !== undefined ? value : undefined,
            title: options.title || (propertyKey as string),
            description: options.description,
            min: options.min,
            max: options.max,
            step: options.step,
            enum: options.enum
        };

        ComponentClass.__attributes.push(attr);
        
        return value;
    };
}
