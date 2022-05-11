import Phaser from 'phaser';

const assetsRoute = 'assets/images/';
const filesRoute = Meteor.settings.public.files.route;

BootScene = new Phaser.Class({
  Extends: Phaser.Scene,

  initialize: function BootScene() {
    Phaser.Scene.call(this, { key: 'BootScene' });
  },

  preload() {
    this.load.image('circle', `${assetsRoute}/circle_white.png`);
    this.load.image('pixel', `${assetsRoute}/pixel.png`);

    Tilesets.find().forEach(tileset => this.load.image(tileset.fileId, `${filesRoute}/${tileset.fileId}`));

    const { frameHeight, frameWidth } = Meteor.settings.public.assets.character;
    Characters.find().forEach(character => {
      this.load.spritesheet(character.fileId, `${filesRoute}/${character.fileId}`, {
        frameWidth: frameWidth || 16,
        frameHeight: frameHeight || 32,
      });
    });

    this.loadAssetsAtRuntime(Assets.find().fetch());
  },

  create() {
    this.scene.add('LoadingScene', LoadingScene, true);
    this.scene.add('WorldScene', WorldScene, true);
    this.scene.add('UIScene', UIScene, true);
    this.scene.add('EditorScene', EditorScene, true);
    this.scene.moveAbove('WorldScene', 'EditorScene');
    this.scene.moveAbove('WorldScene', 'UIScene');
    this.scene.bringToTop('LoadingScene');

    this.loadCharacterAnimations(Characters.find().fetch());
  },

  loadCharacterAnimations(characters) {
    const { formats } = Meteor.settings.public.assets.character;
    characters.forEach(character => {
      if (!character.category) return;

      const { animations } = formats[`w-${character.width}`];
      _.each(animations, (animation, animationName) => {
        _.each(animation, (direction, key) => {
          this.anims.create({
            key: `${animationName}-${key}-${character._id}`,
            frames: this.anims.generateFrameNumbers(character.fileId, { frames: direction.frames }),
            frameRate: direction.frameRate,
            repeat: direction.repeat,
          });
        });
      });
    });
  },

  unloadCharacterAnimations(characters) {
    const { formats } = Meteor.settings.public.assets.character;
    characters.forEach(character => {
      if (!character.category) return;

      const { animations } = formats[`w-${character.width}`];
      _.each(animations, (animation, animationName) => {
        _.each(animation, (direction, key) => {
          this.anims.remove(`${animationName}-${key}-${character._id}`);
        });
      });
    });
  },

  loadImagesAtRuntime(images, onComplete) {
    let imageLoadedCount = 0;
    _.each(images, image => {
      const key = image.fileId || image.key;
      if (this.textures.exists(key)) return;

      const path = image.path || `${filesRoute}/${image.fileId}`;

      if (image.frameWidth || image.frameHeight) {
        this.load.spritesheet(key, path, {
          frameWidth: image.frameWidth || 16,
          frameHeight: image.frameHeight || 32,
        });
      } else this.load.image(key, path);

      imageLoadedCount++;
    });

    if (!imageLoadedCount) onComplete(images);
    else {
      this.load.once(`complete`, () => onComplete(images));
      this.load.start();
    }
  },

  loadAssetsAtRuntime(assets, onComplete = () => {}) {
    let assetsLoadedCount = 0;
    assets.forEach(asset => {
      const key = asset.fileId;
      if (asset.type === 'spritesheet') this.load.multiatlas(key, `${filesRoute}/${key}`, filesRoute);
      assetsLoadedCount++;
    });

    if (assetsLoadedCount) {
      this.load.once(`complete`, () => onComplete(assets));
      this.load.start();
    }
  },
});
