import { Howl, Howler } from 'howler';
import { eventBus } from '@/core/EventBus';

export interface SoundConfig {
  id: string;
  src: string[];
  volume?: number;
  loop?: boolean;
  sprite?: { [key: string]: [number, number] };
  pool?: number;
  preload?: boolean;
}

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  uiVolume: number;
  muted: boolean;
}

export class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private settings: AudioSettings = {
    masterVolume: 1.0,
    sfxVolume: 0.7,
    musicVolume: 0.5,
    uiVolume: 0.8,
    muted: false
  };

  private currentMusic: string | null = null;
  private initialized: boolean = false;

  constructor() {
    this.setupEventListeners();
    this.loadSettings();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Set up Howler global settings
      Howler.volume(this.settings.masterVolume);
      Howler.mute(this.settings.muted);

      // Load essential sounds first
      await this.loadEssentialSounds();

      this.initialized = true;
      eventBus.emit('audio:initialized');
    } catch (error) {
      console.warn('Audio initialization failed:', error);
      // Continue without audio
      this.initialized = true;
    }
  }

  private async loadEssentialSounds(): Promise<void> {
    // Define essential game sounds
    const essentialSounds: SoundConfig[] = [
      {
        id: 'ui_click',
        src: ['data:audio/wav;base64,UklGRn4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAC3t7e3t7e3t7e3t7e3'], // Placeholder click sound
        volume: 0.3,
        pool: 5
      },
      {
        id: 'tower_place',
        src: ['data:audio/wav;base64,UklGRn4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAC3t7e3t7e3t7e3t7e3'], // Placeholder
        volume: 0.5,
        pool: 3
      },
      {
        id: 'enemy_spawn',
        src: ['data:audio/wav;base64,UklGRn4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAC3t7e3t7e3t7e3t7e3'], // Placeholder
        volume: 0.4,
        pool: 10
      },
      {
        id: 'projectile_hit',
        src: ['data:audio/wav;base64,UklGRn4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAC3t7e3t7e3t7e3t7e3'], // Placeholder
        volume: 0.3,
        pool: 20
      },
      {
        id: 'enemy_death',
        src: ['data:audio/wav;base64,UklGRn4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAC3t7e3t7e3t7e3t7e3'], // Placeholder
        volume: 0.4,
        pool: 15
      },
      {
        id: 'wave_start',
        src: ['data:audio/wav;base64,UklGRn4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAC3t7e3t7e3t7e3t7e3'], // Placeholder
        volume: 0.6
      },
      {
        id: 'wave_complete',
        src: ['data:audio/wav;base64,UklGRn4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAC3t7e3t7e3t7e3t7e3'], // Placeholder
        volume: 0.7
      },
      {
        id: 'background_music',
        src: ['data:audio/wav;base64,UklGRn4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAC3t7e3t7e3t7e3t7e3'], // Placeholder
        volume: 0.3,
        loop: true
      }
    ];

    // Load sounds
    const loadPromises = essentialSounds.map(config => this.loadSound(config));
    await Promise.all(loadPromises);
  }

  private loadSound(config: SoundConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const howl = new Howl({
        src: config.src,
        volume: config.volume || 1.0,
        loop: config.loop || false,
        sprite: config.sprite,
        pool: config.pool || 1,
        preload: config.preload !== false,
        onload: () => {
          this.sounds.set(config.id, howl);
          resolve();
        },
        onloaderror: (id, error) => {
          console.warn(`Failed to load sound ${config.id}:`, error);
          // Create a silent placeholder sound
          const silentHowl = new Howl({
            src: ['data:audio/wav;base64,UklGRn4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAC3t7e3t7e3t7e3t7e3'],
            volume: 0
          });
          this.sounds.set(config.id, silentHowl);
          resolve(); // Continue without this sound
        }
      });
    });
  }

  private setupEventListeners(): void {
    // UI Sounds
    eventBus.on('ui:click', () => this.playSound('ui_click', 'ui'));
    eventBus.on('tower:placed', () => this.playSound('tower_place', 'sfx'));
    eventBus.on('tower:upgraded', () => this.playSound('ui_click', 'ui'));

    // Gameplay Sounds
    eventBus.on('enemy:spawned', () => this.playSound('enemy_spawn', 'sfx'));
    eventBus.on('projectile:hit', () => this.playSound('projectile_hit', 'sfx'));
    eventBus.on('enemy:killed', () => this.playSound('enemy_death', 'sfx'));

    // Wave Sounds
    eventBus.on('wave:started', () => this.playSound('wave_start', 'sfx'));
    eventBus.on('wave:completed', () => this.playSound('wave_complete', 'sfx'));

    // Game State Sounds
    eventBus.on('game:started', () => this.playMusic('background_music'));
    eventBus.on('game:paused', () => this.pauseMusic());
    eventBus.on('game:resumed', () => this.resumeMusic());
    eventBus.on('game:over', () => this.stopMusic());
  }

  // Public API
  playSound(soundId: string, category: 'sfx' | 'ui' | 'music' = 'sfx', options?: { volume?: number; rate?: number; seek?: number }): number | null {
    if (!this.initialized || this.settings.muted) return null;

    const sound = this.sounds.get(soundId);
    if (!sound) {
      console.warn(`Sound ${soundId} not found`);
      return null;
    }

    // Calculate final volume
    let categoryVolume = 1.0;
    switch (category) {
      case 'sfx':
        categoryVolume = this.settings.sfxVolume;
        break;
      case 'ui':
        categoryVolume = this.settings.uiVolume;
        break;
      case 'music':
        categoryVolume = this.settings.musicVolume;
        break;
    }

    const finalVolume = (options?.volume || 1.0) * categoryVolume * this.settings.masterVolume;

    try {
      const id = sound.play();
      if (id !== null) {
        sound.volume(finalVolume, id);
        if (options?.rate) sound.rate(options.rate, id);
        if (options?.seek) sound.seek(options.seek, id);
      }
      return id;
    } catch (error) {
      console.warn(`Failed to play sound ${soundId}:`, error);
      return null;
    }
  }

  stopSound(soundId: string, id?: number): void {
    const sound = this.sounds.get(soundId);
    if (sound) {
      if (id !== undefined) {
        sound.stop(id);
      } else {
        sound.stop();
      }
    }
  }

  playMusic(musicId: string, fadeIn: boolean = true): void {
    if (this.currentMusic === musicId) return;

    // Stop current music
    if (this.currentMusic) {
      this.stopMusic(true);
    }

    this.currentMusic = musicId;
    const soundId = this.playSound(musicId, 'music', { volume: fadeIn ? 0 : 1 });

    if (soundId && fadeIn) {
      const sound = this.sounds.get(musicId);
      if (sound) {
        sound.fade(0, this.settings.musicVolume * this.settings.masterVolume, 2000, soundId);
      }
    }
  }

  stopMusic(fadeOut: boolean = true): void {
    if (!this.currentMusic) return;

    const sound = this.sounds.get(this.currentMusic);
    if (sound) {
      if (fadeOut) {
        sound.fade(sound.volume(), 0, 1000);
        setTimeout(() => sound.stop(), 1000);
      } else {
        sound.stop();
      }
    }

    this.currentMusic = null;
  }

  pauseMusic(): void {
    if (this.currentMusic) {
      const sound = this.sounds.get(this.currentMusic);
      if (sound) {
        sound.pause();
      }
    }
  }

  resumeMusic(): void {
    if (this.currentMusic) {
      const sound = this.sounds.get(this.currentMusic);
      if (sound) {
        sound.play();
      }
    }
  }

  // Positional audio
  play3D(soundId: string, x: number, y: number, listenerX: number, listenerY: number, maxDistance: number = 500): number | null {
    const distance = Math.sqrt(Math.pow(x - listenerX, 2) + Math.pow(y - listenerY, 2));
    const volume = Math.max(0, 1 - (distance / maxDistance));

    if (volume <= 0) return null;

    return this.playSound(soundId, 'sfx', { volume });
  }

  // Settings
  setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.settings.masterVolume);
    this.saveSettings();
    eventBus.emit('audio:settingsChanged', this.settings);
  }

  setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    eventBus.emit('audio:settingsChanged', this.settings);
  }

  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    eventBus.emit('audio:settingsChanged', this.settings);
  }

  setUiVolume(volume: number): void {
    this.settings.uiVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    eventBus.emit('audio:settingsChanged', this.settings);
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    Howler.mute(muted);
    this.saveSettings();
    eventBus.emit('audio:settingsChanged', this.settings);
  }

  toggleMute(): boolean {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }

  // Persistence
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('td_audio_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.settings = { ...this.settings, ...settings };
      }
    } catch (error) {
      console.warn('Failed to load audio settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('td_audio_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save audio settings:', error);
    }
  }

  // Getters
  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getCurrentMusic(): string | null {
    return this.currentMusic;
  }

  // Cleanup
  destroy(): void {
    this.stopMusic(false);
    for (const sound of this.sounds.values()) {
      sound.unload();
    }
    this.sounds.clear();
    this.initialized = false;
  }
}