import * as THREE from 'three';

/**
 * EditorControls class - IDENTICAL to Three.js EditorControls.js
 * Custom camera controls for the editor viewport
 */
export class EditorControls extends THREE.EventDispatcher {
  public enabled: boolean = true;
  public center: THREE.Vector3 = new THREE.Vector3();
  public panSpeed: number = 0.002;
  public zoomSpeed: number = 0.1;
  public rotationSpeed: number = 0.005;

  private object: THREE.Camera;
  private domElement: HTMLElement | null = null;

  private vector: THREE.Vector3 = new THREE.Vector3();
  private delta: THREE.Vector3 = new THREE.Vector3();
  private box: THREE.Box3 = new THREE.Box3();
  private normalMatrix: THREE.Matrix3 = new THREE.Matrix3();
  private pointer: THREE.Vector2 = new THREE.Vector2();
  private pointerOld: THREE.Vector2 = new THREE.Vector2();
  private spherical: THREE.Spherical = new THREE.Spherical();
  private sphere: THREE.Sphere = new THREE.Sphere();

  private pointers: number[] = [];
  private pointerPositions: Record<number, THREE.Vector2> = {};

  private STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2 };
  private state: number = this.STATE.NONE;

  private touches: THREE.Vector3[] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  private prevTouches: THREE.Vector3[] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  private prevDistance: number | null = null;

  constructor(object: THREE.Camera) {
    super();
    this.object = object;
  }

  focus(target: THREE.Object3D): void {
    let distance: number;

    this.box.setFromObject(target);

    if (this.box.isEmpty() === false) {
      this.box.getCenter(this.center);
      distance = this.box.getBoundingSphere(this.sphere).radius;
    } else {
      // Focusing on an Group, AmbientLight, etc
      this.center.setFromMatrixPosition(target.matrixWorld);
      distance = 0.1;
    }

    this.delta.set(0, 0, 1);
    this.delta.applyQuaternion(this.object.quaternion);
    this.delta.multiplyScalar(distance * 4);

    this.object.position.copy(this.center).add(this.delta);

    (this as any).dispatchEvent({ type: 'change' });
  }

  pan(delta: THREE.Vector3): void {
    const distance = this.object.position.distanceTo(this.center);

    delta.multiplyScalar(distance * this.panSpeed);
    delta.applyMatrix3(this.normalMatrix.getNormalMatrix(this.object.matrix));

    this.object.position.add(delta);
    this.center.add(delta);

    (this as any).dispatchEvent({ type: 'change' });
  }

  zoom(delta: THREE.Vector3): void {
    const distance = this.object.position.distanceTo(this.center);

    delta.multiplyScalar(distance * this.zoomSpeed);

    if (delta.length() > distance) return;

    delta.applyMatrix3(this.normalMatrix.getNormalMatrix(this.object.matrix));

    this.object.position.add(delta);

    (this as any).dispatchEvent({ type: 'change' });
  }

  rotate(delta: THREE.Vector3): void {
    this.vector.copy(this.object.position).sub(this.center);

    this.spherical.setFromVector3(this.vector);

    this.spherical.theta += delta.x * this.rotationSpeed;
    this.spherical.phi += delta.y * this.rotationSpeed;

    this.spherical.makeSafe();

    this.vector.setFromSpherical(this.spherical);

    this.object.position.copy(this.center).add(this.vector);

    this.object.lookAt(this.center);

    (this as any).dispatchEvent({ type: 'change' });
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (this.enabled === false) return;

    if (this.pointers.length === 0) {
      if (this.domElement) {
        this.domElement.setPointerCapture(event.pointerId);
        this.domElement.ownerDocument.addEventListener('pointermove', this.onPointerMove);
        this.domElement.ownerDocument.addEventListener('pointerup', this.onPointerUp);
      }
    }

    if (this.isTrackingPointer(event)) return;

    this.addPointer(event);

    if (event.pointerType === 'touch') {
      this.onTouchStart(event);
    } else {
      this.onMouseDown(event);
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.enabled === false) return;

    if (event.pointerType === 'touch') {
      this.onTouchMove(event);
    } else {
      this.onMouseMove(event);
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.removePointer(event);

    switch (this.pointers.length) {
      case 0:
        if (this.domElement) {
          this.domElement.releasePointerCapture(event.pointerId);
          this.domElement.ownerDocument.removeEventListener('pointermove', this.onPointerMove);
          this.domElement.ownerDocument.removeEventListener('pointerup', this.onPointerUp);
        }
        break;

      case 1:
        const pointerId = this.pointers[0];
        const position = this.pointerPositions[pointerId];
        // minimal placeholder event - allows state correction on pointer-up
        this.onTouchStart({ pointerId: pointerId, pageX: position.x, pageY: position.y } as PointerEvent);
        break;
    }
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.state = this.STATE.ROTATE;
    } else if (event.button === 1) {
      this.state = this.STATE.ZOOM;
    } else if (event.button === 2) {
      this.state = this.STATE.PAN;
    }

    this.pointerOld.set(event.clientX, event.clientY);
  };

  private onMouseMove = (event: MouseEvent): void => {
    this.pointer.set(event.clientX, event.clientY);

    const movementX = this.pointer.x - this.pointerOld.x;
    const movementY = this.pointer.y - this.pointerOld.y;

    if (this.state === this.STATE.ROTATE) {
      this.rotate(this.delta.set(-movementX, -movementY, 0));
    } else if (this.state === this.STATE.ZOOM) {
      this.zoom(this.delta.set(0, 0, movementY));
    } else if (this.state === this.STATE.PAN) {
      this.pan(this.delta.set(-movementX, movementY, 0));
    }

    this.pointerOld.set(event.clientX, event.clientY);
  };

  private onMouseUp = (): void => {
    this.state = this.STATE.NONE;
  };

  private onMouseWheel = (event: WheelEvent): void => {
    if (this.enabled === false) return;

    event.preventDefault();

    // Normalize deltaY due to https://bugzilla.mozilla.org/show_bug.cgi?id=1392460
    this.zoom(this.delta.set(0, 0, event.deltaY > 0 ? 1 : -1));
  };

  private contextmenu = (event: Event): void => {
    event.preventDefault();
  };

  connect(element: HTMLElement): void {
    if (this.domElement !== null) this.disconnect();

    this.domElement = element;

    this.domElement.addEventListener('contextmenu', this.contextmenu);
    this.domElement.addEventListener('dblclick', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onMouseWheel, { passive: false });

    this.domElement.addEventListener('pointerdown', this.onPointerDown);
  }

  disconnect(): void {
    if (this.domElement) {
      this.domElement.removeEventListener('contextmenu', this.contextmenu);
      this.domElement.removeEventListener('dblclick', this.onMouseUp);
      this.domElement.removeEventListener('wheel', this.onMouseWheel);
      this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    }

    this.domElement = null;
  }

  private onTouchStart = (event: PointerEvent | { pointerId: number; pageX: number; pageY: number }): void => {
    this.trackPointer(event);

    switch (this.pointers.length) {
      case 1:
        this.touches[0].set(event.pageX, event.pageY, 0).divideScalar(window.devicePixelRatio);
        this.touches[1].set(event.pageX, event.pageY, 0).divideScalar(window.devicePixelRatio);
        break;

      case 2:
        const position = this.getSecondPointerPosition(event);
        this.touches[0].set(event.pageX, event.pageY, 0).divideScalar(window.devicePixelRatio);
        this.touches[1].set(position.x, position.y, 0).divideScalar(window.devicePixelRatio);
        this.prevDistance = this.touches[0].distanceTo(this.touches[1]);
        break;
    }

    this.prevTouches[0].copy(this.touches[0]);
    this.prevTouches[1].copy(this.touches[1]);
  };

  private onTouchMove = (event: PointerEvent): void => {
    this.trackPointer(event);

    const getClosest = (touch: THREE.Vector3, touches: THREE.Vector3[]): THREE.Vector3 => {
      let closest = touches[0];
      for (const touch2 of touches) {
        if (closest.distanceTo(touch) > touch2.distanceTo(touch)) closest = touch2;
      }
      return closest;
    };

    switch (this.pointers.length) {
      case 1:
        this.touches[0].set(event.pageX, event.pageY, 0).divideScalar(window.devicePixelRatio);
        this.touches[1].set(event.pageX, event.pageY, 0).divideScalar(window.devicePixelRatio);
        this.rotate(this.touches[0].sub(getClosest(this.touches[0], this.prevTouches)).multiplyScalar(-1));
        break;

      case 2:
        const position = this.getSecondPointerPosition(event);
        this.touches[0].set(event.pageX, event.pageY, 0).divideScalar(window.devicePixelRatio);
        this.touches[1].set(position.x, position.y, 0).divideScalar(window.devicePixelRatio);
        // Divide by 10 to offset inherent over-sensitivity
        const distance = this.touches[0].distanceTo(this.touches[1]) / 10;
        this.zoom(this.delta.set(0, 0, (this.prevDistance || 0) - distance));
        this.prevDistance = distance;

        const offset0 = this.touches[0].clone().sub(getClosest(this.touches[0], this.prevTouches));
        const offset1 = this.touches[1].clone().sub(getClosest(this.touches[1], this.prevTouches));
        offset0.x = -offset0.x;
        offset1.x = -offset1.x;

        this.pan(offset0.add(offset1));
        break;
    }

    this.prevTouches[0].copy(this.touches[0]);
    this.prevTouches[1].copy(this.touches[1]);
  };

  private addPointer(event: PointerEvent | { pointerId: number }): void {
    this.pointers.push(event.pointerId);
  }

  private removePointer(event: PointerEvent | { pointerId: number }): void {
    delete this.pointerPositions[event.pointerId];

    for (let i = 0; i < this.pointers.length; i++) {
      if (this.pointers[i] === event.pointerId) {
        this.pointers.splice(i, 1);
        return;
      }
    }
  }

  private isTrackingPointer(event: PointerEvent | { pointerId: number }): boolean {
    for (let i = 0; i < this.pointers.length; i++) {
      if (this.pointers[i] === event.pointerId) return true;
    }
    return false;
  }

  private trackPointer(event: PointerEvent | { pointerId: number; pageX: number; pageY: number }): void {
    let position = this.pointerPositions[event.pointerId];

    if (position === undefined) {
      position = new THREE.Vector2();
      this.pointerPositions[event.pointerId] = position;
    }

    position.set(event.pageX, event.pageY);
  }

  private getSecondPointerPosition(event: PointerEvent | { pointerId: number }): THREE.Vector2 {
    const pointerId = (event.pointerId === this.pointers[0]) ? this.pointers[1] : this.pointers[0];
    return this.pointerPositions[pointerId];
  }

  fromJSON(json: any): void {
    if (json.center !== undefined) this.center.fromArray(json.center);
  }

  toJSON(): any {
    return {
      center: this.center.toArray()
    };
  }
}
