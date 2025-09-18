import * as Phaser from 'phaser';
import { eventBus } from '@/core/EventBus';
import { QualityLevel } from '@/core/PerformanceManager';

export class SettingsScene extends Phaser.Scene {
  private tabs: { [key: string]: Phaser.GameObjects.Container } = {};
  private activeTab: string = 'audio';
  private background!: Phaser.GameObjects.Rectangle;

  // Settings state
  private audioSettings = {
    masterVolume: 1.0,
    sfxVolume: 0.7,
    musicVolume: 0.5,
    uiVolume: 0.8,
    muted: false
  };

  private graphicsSettings = {
    quality: QualityLevel.HIGH,
    adaptiveQuality: true,
    showHealthBars: true,
    showDamageNumbers: true,
    particleEffects: true,
    screenShake: true
  };

  private gameplaySettings = {
    autoStart: false,
    pauseOnFocusLoss: true,
    showTutorials: true,
    fastForward: false,
    autoSave: true,
    autoSaveInterval: 30
  };

  private keyBindings = {
    pause: 'SPACE',
    menu: 'ESC',
    nextWave: 'ENTER',
    fastForward: 'F',
    togglePerformance: 'P',
    screenshot: 'F12'
  };

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Load saved settings
    this.loadSettings();

    // Background overlay
    this.background = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    this.background.setInteractive();
    this.background.on('pointerdown', () => this.closeSettings());

    // Main settings panel
    const panel = this.add.container(width / 2, height / 2);
    const panelBg = this.add.rectangle(0, 0, 800, 600, 0x2c3e50);
    panelBg.setStrokeStyle(2, 0x34495e);

    // Title
    const title = this.add.text(0, -280, 'SETTINGS', {
      fontSize: '32px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Close button
    const closeButton = this.add.rectangle(350, -250, 60, 40, 0xe74c3c);
    const closeText = this.add.text(350, -250, '✕', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    closeButton.setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => this.closeSettings());

    panel.add([panelBg, title, closeButton, closeText]);

    // Create tabs
    this.createTabs(panel);

    // Create tab content
    this.createAudioTab(panel);
    this.createGraphicsTab(panel);
    this.createGameplayTab(panel);
    this.createControlsTab(panel);

    // Action buttons
    this.createActionButtons(panel);

    // Set initial tab
    this.switchTab('audio');

    // Don't interfere with main game input
    this.input.keyboard?.resetKeys();
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('td_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.audioSettings = { ...this.audioSettings, ...settings.audio };
        this.graphicsSettings = { ...this.graphicsSettings, ...settings.graphics };
        this.gameplaySettings = { ...this.gameplaySettings, ...settings.gameplay };
        this.keyBindings = { ...this.keyBindings, ...settings.controls };
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      const settings = {
        audio: this.audioSettings,
        graphics: this.graphicsSettings,
        gameplay: this.gameplaySettings,
        controls: this.keyBindings
      };
      localStorage.setItem('td_settings', JSON.stringify(settings));

      // Apply settings immediately
      this.applySettings();

    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }

  private applySettings(): void {
    // Apply audio settings
    eventBus.emit('audio:setMasterVolume', this.audioSettings.masterVolume);
    eventBus.emit('audio:setSfxVolume', this.audioSettings.sfxVolume);
    eventBus.emit('audio:setMusicVolume', this.audioSettings.musicVolume);
    eventBus.emit('audio:setUiVolume', this.audioSettings.uiVolume);
    eventBus.emit('audio:setMuted', this.audioSettings.muted);

    // Apply graphics settings
    eventBus.emit('performance:setQuality', { level: this.graphicsSettings.quality });
    eventBus.emit('performance:toggleAdaptive', { enabled: this.graphicsSettings.adaptiveQuality });

    // Apply gameplay settings
    eventBus.emit('game:settingsChanged', this.gameplaySettings);
  }

  private createTabs(panel: Phaser.GameObjects.Container): void {
    const tabs = ['Audio', 'Graphics', 'Gameplay', 'Controls'];
    const tabWidth = 150;
    const startX = -(tabs.length - 1) * tabWidth / 2;

    tabs.forEach((tabName, index) => {
      const x = startX + index * tabWidth;
      const y = -220;

      const tabBg = this.add.rectangle(x, y, tabWidth - 10, 40, 0x34495e);
      const tabText = this.add.text(x, y, tabName, {
        fontSize: '16px',
        color: '#bdc3c7',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      tabBg.setInteractive({ useHandCursor: true });
      tabBg.on('pointerdown', () => this.switchTab(tabName.toLowerCase()));

      panel.add([tabBg, tabText]);

      // Store tab references
      if (!this.tabs[tabName.toLowerCase()]) {
        this.tabs[tabName.toLowerCase()] = this.add.container(0, 0);
        panel.add(this.tabs[tabName.toLowerCase()]);
      }
    });
  }

  private createAudioTab(panel: Phaser.GameObjects.Container): void {
    const tab = this.tabs['audio'];

    // Master Volume
    this.createSlider(tab, 'Master Volume', 0, -120, this.audioSettings.masterVolume, (value) => {
      this.audioSettings.masterVolume = value;
    });

    // SFX Volume
    this.createSlider(tab, 'SFX Volume', 0, -60, this.audioSettings.sfxVolume, (value) => {
      this.audioSettings.sfxVolume = value;
    });

    // Music Volume
    this.createSlider(tab, 'Music Volume', 0, 0, this.audioSettings.musicVolume, (value) => {
      this.audioSettings.musicVolume = value;
    });

    // UI Volume
    this.createSlider(tab, 'UI Volume', 0, 60, this.audioSettings.uiVolume, (value) => {
      this.audioSettings.uiVolume = value;
    });

    // Mute Toggle
    this.createToggle(tab, 'Mute All', 0, 120, this.audioSettings.muted, (value) => {
      this.audioSettings.muted = value;
    });
  }

  private createGraphicsTab(panel: Phaser.GameObjects.Container): void {
    const tab = this.tabs['graphics'];

    // Quality Dropdown
    this.createDropdown(tab, 'Quality', 0, -120,
      ['Low', 'Medium', 'High', 'Ultra'],
      this.graphicsSettings.quality,
      (value) => {
        this.graphicsSettings.quality = value;
      }
    );

    // Adaptive Quality
    this.createToggle(tab, 'Adaptive Quality', 0, -60, this.graphicsSettings.adaptiveQuality, (value) => {
      this.graphicsSettings.adaptiveQuality = value;
    });

    // Health Bars
    this.createToggle(tab, 'Show Health Bars', 0, 0, this.graphicsSettings.showHealthBars, (value) => {
      this.graphicsSettings.showHealthBars = value;
    });

    // Damage Numbers
    this.createToggle(tab, 'Show Damage Numbers', 0, 60, this.graphicsSettings.showDamageNumbers, (value) => {
      this.graphicsSettings.showDamageNumbers = value;
    });

    // Particle Effects
    this.createToggle(tab, 'Particle Effects', 0, 120, this.graphicsSettings.particleEffects, (value) => {
      this.graphicsSettings.particleEffects = value;
    });
  }

  private createGameplayTab(panel: Phaser.GameObjects.Container): void {
    const tab = this.tabs['gameplay'];

    // Auto Start Waves
    this.createToggle(tab, 'Auto Start Waves', 0, -120, this.gameplaySettings.autoStart, (value) => {
      this.gameplaySettings.autoStart = value;
    });

    // Pause on Focus Loss
    this.createToggle(tab, 'Pause When Unfocused', 0, -60, this.gameplaySettings.pauseOnFocusLoss, (value) => {
      this.gameplaySettings.pauseOnFocusLoss = value;
    });

    // Show Tutorials
    this.createToggle(tab, 'Show Tutorials', 0, 0, this.gameplaySettings.showTutorials, (value) => {
      this.gameplaySettings.showTutorials = value;
    });

    // Auto Save
    this.createToggle(tab, 'Auto Save', 0, 60, this.gameplaySettings.autoSave, (value) => {
      this.gameplaySettings.autoSave = value;
    });

    // Auto Save Interval
    this.createSlider(tab, 'Auto Save Interval (seconds)', 0, 120, this.gameplaySettings.autoSaveInterval / 60, (value) => {
      this.gameplaySettings.autoSaveInterval = value * 60;
    }, 1, 10);
  }

  private createControlsTab(panel: Phaser.GameObjects.Container): void {
    const tab = this.tabs['controls'];

    const controls = [
      { label: 'Pause Game', key: 'pause' },
      { label: 'Main Menu', key: 'menu' },
      { label: 'Next Wave', key: 'nextWave' },
      { label: 'Fast Forward', key: 'fastForward' },
      { label: 'Performance Overlay', key: 'togglePerformance' }
    ];

    controls.forEach((control, index) => {
      const y = -120 + index * 60;
      this.createKeyBinding(tab, control.label, 0, y, this.keyBindings[control.key], (value) => {
        this.keyBindings[control.key] = value;
      });
    });
  }

  private createSlider(container: Phaser.GameObjects.Container, label: string, x: number, y: number,
                      value: number, onChange: (value: number) => void, min: number = 0, max: number = 1): void {
    const labelText = this.add.text(x - 150, y, label, {
      fontSize: '14px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif'
    });

    const sliderBg = this.add.rectangle(x + 50, y, 200, 10, 0x34495e);
    const sliderFill = this.add.rectangle(x + 50 - 100 + (value / (max - min)) * 200, y, (value / (max - min)) * 200, 10, 0x3498db);
    const sliderHandle = this.add.circle(x + 50 - 100 + (value / (max - min)) * 200, y, 8, 0xecf0f1);

    const valueText = this.add.text(x + 170, y, Math.round(value * 100) + (max > 1 ? '' : '%'), {
      fontSize: '12px',
      color: '#bdc3c7',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0, 0.5);

    sliderHandle.setInteractive({ draggable: true });
    sliderHandle.on('drag', (pointer: Phaser.Input.Pointer) => {
      const newX = Phaser.Math.Clamp(pointer.x - (x + 50 - 100), 0, 200);
      const newValue = min + (newX / 200) * (max - min);

      sliderHandle.setPosition(x + 50 - 100 + newX, y);
      sliderFill.setSize(newX, 10);
      sliderFill.setPosition(x + 50 - 100 + newX / 2, y);

      valueText.setText(Math.round(newValue * (max > 1 ? 1 : 100)) + (max > 1 ? 's' : '%'));
      onChange(newValue);
    });

    container.add([labelText, sliderBg, sliderFill, sliderHandle, valueText]);
  }

  private createToggle(container: Phaser.GameObjects.Container, label: string, x: number, y: number,
                      value: boolean, onChange: (value: boolean) => void): void {
    const labelText = this.add.text(x - 150, y, label, {
      fontSize: '14px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif'
    });

    const toggleBg = this.add.rectangle(x + 100, y, 60, 30, value ? 0x27ae60 : 0x7f8c8d);
    const toggleHandle = this.add.circle(x + 100 + (value ? 15 : -15), y, 12, 0xecf0f1);

    toggleBg.setInteractive({ useHandCursor: true });
    toggleBg.on('pointerdown', () => {
      const newValue = !value;
      value = newValue;

      toggleBg.setFillStyle(newValue ? 0x27ae60 : 0x7f8c8d);
      toggleHandle.setPosition(x + 100 + (newValue ? 15 : -15), y);

      onChange(newValue);
    });

    container.add([labelText, toggleBg, toggleHandle]);
  }

  private createDropdown(container: Phaser.GameObjects.Container, label: string, x: number, y: number,
                        options: string[], selectedIndex: number, onChange: (index: number) => void): void {
    const labelText = this.add.text(x - 150, y, label, {
      fontSize: '14px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif'
    });

    const dropdownBg = this.add.rectangle(x + 100, y, 120, 30, 0x34495e);
    const dropdownText = this.add.text(x + 100, y, options[selectedIndex], {
      fontSize: '12px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    const arrow = this.add.text(x + 150, y, '▼', {
      fontSize: '10px',
      color: '#bdc3c7',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    dropdownBg.setInteractive({ useHandCursor: true });
    dropdownBg.on('pointerdown', () => {
      // Cycle through options (simplified dropdown)
      const nextIndex = (selectedIndex + 1) % options.length;
      selectedIndex = nextIndex;
      dropdownText.setText(options[nextIndex]);
      onChange(nextIndex);
    });

    container.add([labelText, dropdownBg, dropdownText, arrow]);
  }

  private createKeyBinding(container: Phaser.GameObjects.Container, label: string, x: number, y: number,
                          currentKey: string, onChange: (key: string) => void): void {
    const labelText = this.add.text(x - 150, y, label, {
      fontSize: '14px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif'
    });

    const keyBg = this.add.rectangle(x + 100, y, 80, 30, 0x34495e);
    const keyText = this.add.text(x + 100, y, currentKey, {
      fontSize: '12px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    keyBg.setInteractive({ useHandCursor: true });
    keyBg.on('pointerdown', () => {
      keyText.setText('Press key...');
      keyBg.setFillStyle(0xf39c12);

      // Listen for key press
      const keyListener = (event: KeyboardEvent) => {
        const newKey = event.code.replace('Key', '').replace('Digit', '');
        keyText.setText(newKey);
        keyBg.setFillStyle(0x34495e);
        onChange(newKey);

        // Remove listener
        this.input.keyboard?.off('keydown', keyListener);
      };

      this.input.keyboard?.on('keydown', keyListener);
    });

    container.add([labelText, keyBg, keyText]);
  }

  private createActionButtons(panel: Phaser.GameObjects.Container): void {
    // Save button
    const saveButton = this.add.rectangle(-100, 250, 120, 40, 0x27ae60);
    const saveText = this.add.text(-100, 250, 'SAVE', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    saveButton.setInteractive({ useHandCursor: true });
    saveButton.on('pointerdown', () => {
      this.saveSettings();
      this.showConfirmation('Settings saved!');
    });

    // Reset button
    const resetButton = this.add.rectangle(0, 250, 120, 40, 0xe67e22);
    const resetText = this.add.text(0, 250, 'RESET', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    resetButton.setInteractive({ useHandCursor: true });
    resetButton.on('pointerdown', () => {
      this.resetToDefaults();
    });

    // Cancel button
    const cancelButton = this.add.rectangle(100, 250, 120, 40, 0x95a5a6);
    const cancelText = this.add.text(100, 250, 'CANCEL', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    cancelButton.setInteractive({ useHandCursor: true });
    cancelButton.on('pointerdown', () => {
      this.closeSettings();
    });

    panel.add([saveButton, saveText, resetButton, resetText, cancelButton, cancelText]);
  }

  private switchTab(tabName: string): void {
    // Hide all tabs
    Object.values(this.tabs).forEach(tab => tab.setVisible(false));

    // Show selected tab
    if (this.tabs[tabName]) {
      this.tabs[tabName].setVisible(true);
      this.activeTab = tabName;
    }
  }

  private resetToDefaults(): void {
    this.audioSettings = {
      masterVolume: 1.0,
      sfxVolume: 0.7,
      musicVolume: 0.5,
      uiVolume: 0.8,
      muted: false
    };

    this.graphicsSettings = {
      quality: QualityLevel.HIGH,
      adaptiveQuality: true,
      showHealthBars: true,
      showDamageNumbers: true,
      particleEffects: true,
      screenShake: true
    };

    this.gameplaySettings = {
      autoStart: false,
      pauseOnFocusLoss: true,
      showTutorials: true,
      fastForward: false,
      autoSave: true,
      autoSaveInterval: 30
    };

    this.showConfirmation('Settings reset to defaults!');
  }

  private showConfirmation(message: string): void {
    const { width, height } = this.cameras.main;

    const confirmation = this.add.text(width / 2, height - 100, message, {
      fontSize: '18px',
      color: '#27ae60',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.tweens.add({
      targets: confirmation,
      alpha: 0,
      y: height - 150,
      duration: 2000,
      onComplete: () => confirmation.destroy()
    });
  }

  private closeSettings(): void {
    eventBus.emit('ui:click');
    this.scene.stop();
  }
}