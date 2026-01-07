import * as THREE from 'three';
import { Editor } from '../../Editor';
import { UIPanel, UIRow, UIHorizontalRule } from '../../libs';

/**
 * MenubarFile class adapted from Three.js Menubar.File.js
 * File menu with New, Open, Save, Import, Export options
 */
export class MenubarFile {
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
    title.setTextContent(this.strings.getKey('menubar/file') || 'File');
    this.container.add(title);

    const options = new UIPanel();
    options.setClass('options');
    this.container.add(options);

    // New Project submenu
    this.createNewProjectMenu(options);

    // Open
    this.createOpenOption(options);

    // Save
    this.createSaveOption(options);

    options.add(new UIHorizontalRule());

    // Import
    this.createImportOption(options);

    // Export submenu
    this.createExportMenu(options);
  }

  private createNewProjectMenu(options: UIPanel): void {
    const newProjectSubmenuTitle = new UIRow()
      .setTextContent(this.strings.getKey('menubar/file/new') || 'New')
      .addClass('option')
      .addClass('submenu-title');

    const newProjectSubmenu = new UIPanel()
      .setPosition('fixed')
      .addClass('options')
      .setDisplay('none');

    newProjectSubmenuTitle.onMouseOver(() => {
      const { top, right } = newProjectSubmenuTitle.dom.getBoundingClientRect();
      const { paddingTop } = getComputedStyle(newProjectSubmenuTitle.dom);
      newProjectSubmenu.setLeft(right + 'px');
      newProjectSubmenu.setTop((top - parseFloat(paddingTop)) + 'px');
      newProjectSubmenu.setDisplay('block');
    });

    newProjectSubmenuTitle.onMouseOut(() => {
      newProjectSubmenu.setDisplay('none');
    });

    newProjectSubmenuTitle.add(newProjectSubmenu);
    options.add(newProjectSubmenuTitle);

    // Empty project
    const emptyOption = new UIRow()
      .setTextContent(this.strings.getKey('menubar/file/new/empty') || 'Empty Project')
      .setClass('option');
    emptyOption.onClick(() => {
      if (confirm(this.strings.getKey('prompt/file/open') || 'All unsaved data will be lost. Are you sure?')) {
        (this.editor as any).clear();
      }
    });
    newProjectSubmenu.add(emptyOption);

    newProjectSubmenu.add(new UIHorizontalRule());

    // Example projects (simplified - can be expanded later)
    const examples = [
      { title: 'menubar/file/new/Arkanoid', file: 'arkanoid.app.json' },
      { title: 'menubar/file/new/Camera', file: 'camera.app.json' },
      { title: 'menubar/file/new/Particles', file: 'particles.app.json' },
      { title: 'menubar/file/new/Pong', file: 'pong.app.json' },
      { title: 'menubar/file/new/Shaders', file: 'shaders.app.json' }
    ];

    const loader = new THREE.FileLoader();

    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      const option = new UIRow()
        .setClass('option')
        .setTextContent(this.strings.getKey(example.title) || example.title);
      
      option.onClick(() => {
        if (confirm(this.strings.getKey('prompt/file/open') || 'All unsaved data will be lost. Are you sure?')) {
          loader.load('examples/' + example.file, (text) => {
            (this.editor as any).clear();
            (this.editor as any).fromJSON(JSON.parse(text as string));
          });
        }
      });
      
      newProjectSubmenu.add(option);
    }
  }

  private createOpenOption(options: UIPanel): void {
    const openProjectForm = document.createElement('form');
    openProjectForm.style.display = 'none';
    document.body.appendChild(openProjectForm);

    const openProjectInput = document.createElement('input');
    openProjectInput.multiple = false;
    openProjectInput.type = 'file';
    openProjectInput.accept = '.json';
    
    openProjectInput.addEventListener('change', async () => {
      const file = openProjectInput.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const json = JSON.parse(text);

        const onEditorCleared = async () => {
          await (this.editor as any).fromJSON(json);
          this.editor.signals.editorCleared?.remove(onEditorCleared);
        };

        this.editor.signals.editorCleared?.add(onEditorCleared);
        (this.editor as any).clear();
      } catch (e) {
        alert(this.strings.getKey('prompt/file/failedToOpenProject') || 'Failed to open project');
        console.error(e);
      } finally {
        openProjectForm.reset();
      }
    });

    openProjectForm.appendChild(openProjectInput);

    const option = new UIRow()
      .addClass('option')
      .setTextContent(this.strings.getKey('menubar/file/open') || 'Open')
      .onClick(() => {
        if (confirm(this.strings.getKey('prompt/file/open') || 'All unsaved data will be lost. Are you sure?')) {
          openProjectInput.click();
        }
      });

    options.add(option);
  }

  private createSaveOption(options: UIPanel): void {
    const option = new UIRow()
      .addClass('option')
      .setTextContent(this.strings.getKey('menubar/file/save') || 'Save')
      .onClick(() => {
        const json = (this.editor as any).toJSON();
        const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
        this.saveBlob(blob, 'project.json');
      });

    options.add(option);
  }

  private createImportOption(options: UIPanel): void {
    const form = document.createElement('form');
    form.style.display = 'none';
    document.body.appendChild(form);

    const fileInput = document.createElement('input');
    fileInput.multiple = true;
    fileInput.type = 'file';
    fileInput.addEventListener('change', () => {
      if ((this.editor as any).loader && fileInput.files) {
        (this.editor as any).loader.loadFiles(fileInput.files);
      }
      form.reset();
    });
    form.appendChild(fileInput);

    const option = new UIRow()
      .setClass('option')
      .setTextContent(this.strings.getKey('menubar/file/import') || 'Import')
      .onClick(() => {
        fileInput.click();
      });

    options.add(option);
  }

  private createExportMenu(options: UIPanel): void {
    const fileExportSubmenuTitle = new UIRow()
      .setTextContent(this.strings.getKey('menubar/file/export') || 'Export')
      .addClass('option')
      .addClass('submenu-title');

    const fileExportSubmenu = new UIPanel()
      .setPosition('fixed')
      .addClass('options')
      .setDisplay('none');

    fileExportSubmenuTitle.onMouseOver(() => {
      const { top, right } = fileExportSubmenuTitle.dom.getBoundingClientRect();
      const { paddingTop } = getComputedStyle(fileExportSubmenuTitle.dom);
      fileExportSubmenu.setLeft(right + 'px');
      fileExportSubmenu.setTop((top - parseFloat(paddingTop)) + 'px');
      fileExportSubmenu.setDisplay('block');
    });

    fileExportSubmenuTitle.onMouseOut(() => {
      fileExportSubmenu.setDisplay('none');
    });

    fileExportSubmenuTitle.add(fileExportSubmenu);
    options.add(fileExportSubmenuTitle);

    // Export options (simplified - can be expanded with actual exporters)
    const exportFormats = ['GLB', 'GLTF', 'OBJ', 'STL'];
    
    for (const format of exportFormats) {
      const option = new UIRow()
        .setClass('option')
        .setTextContent(format)
        .onClick(() => {
          // Export logic will be implemented when exporters are added
          console.log(`Export as ${format} - to be implemented`);
        });
      fileExportSubmenu.add(option);
    }
  }

  private saveBlob(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

