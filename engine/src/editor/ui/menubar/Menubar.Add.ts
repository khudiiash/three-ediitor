import { Editor } from '../../Editor';
import { UIPanel, UIRow, UIHorizontalRule } from '../../libs';

/**
 * MenubarAdd class adapted from Three.js Menubar.Add.js
 * Add menu for creating new objects
 */
export class MenubarAdd {
  private editor: Editor;
  private strings: any;
  private container: UIPanel;

  constructor(editor: Editor) {
    this.editor = editor;
    this.strings = editor.strings;
    this.container = new UIPanel();
    this.container.setClass('menu');

    this.createMenu();
  }

  private createMenu(): void {
    const title = new UIPanel();
    title.setClass('title');
    title.setTextContent(this.strings.getKey('menubar/add') || 'Add');
    this.container.add(title);

    const options = new UIPanel();
    options.setClass('options');
    this.container.add(options);

    // Group
    const groupOption = new UIRow()
      .setClass('option')
      .setTextContent(this.strings.getKey('menubar/add/group') || 'Group')
      .onClick(() => {
        const group = new THREE.Group();
        group.name = 'Group';
        this.editor.addObject(group);
        this.editor.selectObject(group);
      });
    options.add(groupOption);

    options.add(new UIHorizontalRule());

    // Mesh submenu
    this.createMeshSubmenu(options);
  }

  private createMeshSubmenu(options: UIPanel): void {
    const meshSubmenuTitle = new UIRow()
      .setTextContent(this.strings.getKey('menubar/add/mesh') || 'Mesh')
      .addClass('option')
      .addClass('submenu-title');

    const meshSubmenu = new UIPanel()
      .setPosition('fixed')
      .addClass('options')
      .setDisplay('none');

    meshSubmenuTitle.onMouseOver(() => {
      const { top, right } = meshSubmenuTitle.dom.getBoundingClientRect();
      const { paddingTop } = getComputedStyle(meshSubmenuTitle.dom);
      meshSubmenu.setLeft(right + 'px');
      meshSubmenu.setTop((top - parseFloat(paddingTop)) + 'px');
      meshSubmenu.setDisplay('block');
    });

    meshSubmenuTitle.onMouseOut(() => {
      meshSubmenu.setDisplay('none');
    });

    meshSubmenuTitle.add(meshSubmenu);
    options.add(meshSubmenuTitle);

    // Basic geometries
    const geometries = [
      { name: 'Plane', key: 'menubar/add/mesh/plane', create: () => new THREE.Mesh(new THREE.PlaneGeometry(1, 1)) },
      { name: 'Box', key: 'menubar/add/mesh/box', create: () => new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)) },
      { name: 'Sphere', key: 'menubar/add/mesh/sphere', create: () => new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32)) },
      { name: 'Cylinder', key: 'menubar/add/mesh/cylinder', create: () => new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 32)) },
      { name: 'Torus', key: 'menubar/add/mesh/torus', create: () => new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.2, 16, 100)) },
    ];

    for (const geom of geometries) {
      const option = new UIRow()
        .setClass('option')
        .setTextContent(this.strings.getKey(geom.key) || geom.name)
        .onClick(() => {
          const mesh = geom.create();
          mesh.name = geom.name;
          mesh.material = new THREE.MeshStandardMaterial();
          this.editor.addObject(mesh);
          this.editor.selectObject(mesh);
        });
      meshSubmenu.add(option);
    }
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

