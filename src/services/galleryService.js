const manifest = require('../data/galleries-manifest.json');

class GalleryService {
  async getGalleryData(galleryName) {
    if (manifest && manifest.details && manifest.details[galleryName]) {
      return manifest.details[galleryName];
    }
    return {
      galleryPath: `/galleries/${galleryName}`,
      imageNames: [],
      videosFolderExists: false
    };
  }

  async getAllGalleries() {
    if (manifest && manifest.galleries) {
      return manifest.galleries;
    }
    return [];
  }

  async hasGallery(galleryName) {
    if (manifest && manifest.details) {
      return Boolean(manifest.details[galleryName]);
    }
    return false;
  }
}

module.exports = new GalleryService();
